/* istanbul ignore file */
// testing cluster functionality is out of scope for this project.

import cluster from "cluster";
import * as fs from "fs";
import path from "path";
import { apm, count, Counter, env, errno, error, getLogger, Histogram, LogLevel, Meter, POJO } from "../../utils";
import { Bridge, BridgeError, Packet, PktData, PKT_TOPIC } from "./bridge";
import { initMaster } from "./master";
import { WorkerConf, WorkerInfo, WorkerState } from "./workerConf";


const logger = getLogger("Cluster", LogLevel.info);
const log = logger.info.bind(logger);
const apps = new Array<WorkerConf>();
let interval: NodeJS.Timeout;
let bridge: Bridge;


// bridge master dispatcher
// dispatch packet to the requested process or handle it here if it's directed to master
function clusterDispatch(pkt: Readonly<Packet>) {
  try {
    if (!pkt || !pkt._topic || pkt._topic !== PKT_TOPIC) return;

    // if packet source and dest are both master so hack a response here
    if (pkt._source === "master" && pkt._dest === "master" && pkt._shouldReply) {
      bridge._injectPkt(pkt);
      return;
    }

    if (pkt._source === "bcast") {
      throw new BridgeError("packet source cannot be bcast");
    }

    switch (pkt._dest) {

      case "master":
        // message from client thru master bridge
        process.emit("message", pkt, {});
        break;

      case "bcast":
        // send to all connected clients, except the sender
        for (const i in cluster.workers) {
          const worker = cluster.workers[i];
          if (pkt._source !== worker.id) {
            const pkt2 = new Packet(pkt._source, worker.id, pkt._data);
            clusterDispatch(pkt2);
          }
        }
        // reply to caller
        if (pkt._shouldReply) {
          const pkt2 = new Packet("master", pkt._source, pkt._data, pkt._shouldReply, pkt._pktId);
          clusterDispatch(pkt2);
        }
        break;

      default:
        // send to another process
        for (const i in cluster.workers) {
          const worker = cluster.workers[i];
          if (pkt._dest === worker.id) {
            worker.send(pkt, undefined, (err: BridgeError) => {
              if (err) {
                logger.error("clusterDispatch failed:", err);
              }
            });
          }
        }
    } // switch
  } catch (err) {
    logger.error("clusterDispatch", err.stack || err);
  }
}


function clusterApmHandler(data: PktData, reply: (data: PktData) => void) {
  if (data.msg !== "apm") return false;

  const waitFor: Promise<PktData>[] = [];
  let apmErrors = 0;
  apm.reset(true);

  for (const k in cluster.workers) {
    const worker = cluster.workers[k];
    const info = Object(worker).__info__ as WorkerInfo;
    count(`cluster.workers.${WorkerState[info.state]}`);
    if (!info || info.state !== WorkerState.pinging) continue;
    waitFor.push(bridge.send("apm", worker.id));
  }

  Promise.allSettled(waitFor).then(values => {
    values.forEach(value => {
      if (value.status === "fulfilled") {
        const pkt = value.value;
        logger.assert(pkt.msg === "apm");
        if (pkt.error || typeof pkt.apm !== "object") {
          logger.error("apm response error", pkt.error);
          apmErrors++;
        } else {
          const pktApm = pkt.apm;
          Object.keys(pktApm).forEach(type => {
            Object.keys(pktApm[type]).forEach(key => {
              switch (type) {
                case "counters":
                  Counter.instance(key, pktApm[type][key]);
                  break;
                case "meters":
                  Meter.instance(key, pktApm[type][key]);
                  break;
                case "histograms":
                  Histogram.instance(key, pktApm[type][key]);
                  break;
                default:
                  logger.error("apm: unnkown counter type:", type);
              }
            });
          });
        }
      } else {
        // rejected / timeout??
        logger.error("apm response rejected:", value.reason);
        apmErrors++;
      }
    });
  }, err => {
    // we should not get here...
    logger.error("allSettled error:", err);
    apmErrors++;
  }).catch(err => {
    // we should not get here either...
    logger.error("allSettled catch:", err);
    apmErrors++;
  }).finally(() => {
    if (apmErrors) count("cluster.apmErrors", apmErrors);
    data.apm = apm.getAll();
    reply(data);
  });

  return true;
}


function clusterDestroy(signal: NodeJS.Signals) {
  log(`Master stopping on ${signal}...`);

  if (interval) clearInterval(interval);
  interval = undefined;

  for (const i in cluster.workers) {
    const worker = cluster.workers[i];
    const info = Object(worker).__info__ as WorkerInfo;
    const app = apps[info.idx];

    if (app.shutdown_with_message) {
      log(`Wroker ${worker.id}: ${signal}`);
      worker.send(signal);
    } else {
      log(`Wroker ${worker.id}: destroy`);
      worker.destroy(signal);
    }
  }

  // live workers have been signaled >> cluster would exit from cluster.on("exit")
  setImmediate(() => {
    const live = Object.keys(cluster.workers).length;
    if (!live) {
      process.exit(0);
    }
  });

  // failsafe timeout
  setTimeout(() => {
    log("clusterDestory timeout");
    process.exit(0);
  }, WorkerConf.KILL_TIMEOUT).unref();
}


async function workerCheck(worker: cluster.Worker) {

  try {
    const info = Object(worker).__info__ as WorkerInfo;
    const app = apps[info.idx];

    // ping worker
    const pkt = await bridge.send("ping", worker.id);
    logger.assert(pkt.msg === "pong");

    // check health
    if (!!app.max_memory_restart && Number(pkt.mem) > app.max_memory_restart && info.lastMem > app.max_memory_restart) {
      log(`worker ${worker.id} memory over max: ${pkt.mem} MB`);
      return false;
    } else if (Number(pkt.cpu >= 99 && info.lastCpu >= 99)) {
      log(`worker ${worker.id} CPU over max: ${pkt.cpu}%`);
      return false;
    }

    info.state = WorkerState.pinging;
    info.lastCpu = Number(pkt.cpu);
    info.lastMem = Number(pkt.mem);
  } catch (err) {
    // if the worker is not implementing the bridge all the pings send will timeout.
    // this does not mean the worker is unhealthy. the worker state will remain online/listening.
    logger.info(`ping to worker ${worker.id} did not answer.`, err.stack || err);
  }
  return true;
}


async function clusterMaint() {

  const toKill: cluster.Worker[] = [];

  for (const k in cluster.workers) {
    const worker = cluster.workers[k];
    const info = Object(worker).__info__ as WorkerInfo;
    if (!info) continue;
    const app = apps[info.idx];

    const tDiff = Date.now() - info.lastUpdate;
    log(`worker ${worker.id} isDead=${worker.isDead()} info=${info.idx}:${WorkerState[info.state]} tDiff=${tDiff}`);

    if (worker.isDead()) {
      toKill.push(worker);
    }

    switch (info.state) {

      case WorkerState.init:
      case WorkerState.online:
        if (app.wait_ready && tDiff > app.listen_timeout) {
          toKill.push(worker);
        }
        break;

      case WorkerState.pinging:
        if (!!app.kill_timeout && tDiff > app.kill_timeout) {
          toKill.push(worker);
        }

        { } // fall through

      case WorkerState.listening:
        // try to ping worker
        if (!await workerCheck(worker)) {
          toKill.push(worker);
        }
        break;

      case WorkerState.disconnected:
      default:
        if (tDiff > WorkerConf.KILL_TIMEOUT) {
          toKill.push(worker);
        }
        break;
    }
  }

  // dont kill workers while debugging...
  if (!env.isDebugging) {
    toKill.forEach(worker => {
      log(`terminating worker ${worker.id}`);
      worker.destroy("SIGKILL");
    });
  }
}


function clusterFork(app: WorkerConf, idx: number, restarts = 0) {

  if (!fs.existsSync(app.script)) {
    error("'script' must be a js/ts file'");
    return;
  }

  const save1 = process.env.LOG_ADD_TIME;
  process.env.LOG_ADD_TIME = String(app.time);

  const save2 = process.env.APP_NAME;
  process.env.APP_NAME = process.env.APP_NAME + ":" + app.name;

  const save3 = process.cwd();
  process.chdir(app.cwd);

  cluster.setupMaster({
    execArgv: ["-r", "ts-node/register"], // required to fork typescript
    args: app.args.split(" "),
    exec: app.script,
    silent: true,
  });
  const worker = cluster.fork();
  Object(worker).__info__ = new WorkerInfo(idx, restarts);

  process.env.LOG_ADD_TIME = save1;
  process.env.APP_NAME = save2;
  process.chdir(save3);

  if (app.out_file) {
    const fname = path.resolve(app.out_file + (app.combine_logs ? "" : `.${worker.id}`));
    const dir = fname.substr(0, fname.lastIndexOf(path.sep) + 1);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const fsout = fs.createWriteStream(fname, { flags: "a" });
    worker.process.stdout.pipe(fsout);
  }

  if (app.error_file) {
    const fname = path.resolve(app.error_file + (app.combine_logs ? "" : `.${worker.id}`));
    const dir = fname.substr(0, fname.lastIndexOf(path.sep) + 1);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const fsout = fs.createWriteStream(fname, { flags: "a" });
    worker.process.stderr.pipe(fsout);
  }

  if (app.pid_file) {
    const fname = path.resolve(app.pid_file, `${app.name}-${worker.id}.pid`);
    const dir = fname.substr(0, fname.lastIndexOf(path.sep) + 1);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    fs.writeFileSync(fname, worker.process.pid.toString());
  }
}


/*
 * start the cluster
 * arr: array or Partial<WorkerApp>
 */
export async function clusterStart(arr: POJO[]) {
  if (cluster.isMaster) {
    log(`Master starting on pid ${process.pid}...`);

    // restart previous cluster
    if (apps.length) {
      log("Master restarting");
      clusterDestroy("SIGTERM");
      apps.length = 0;
    }

    // Master can be terminated by either SIGTERM
    // or SIGINT. The later is used by CTRL+C on console.
    cluster.on("online", (worker) => {
      log(`worker ${worker.id} is online`);

      const info = Object(worker).__info__ as WorkerInfo;
      info.state = WorkerState.online;
    });

    cluster.on("disconnect", (worker) => {
      log(`worker ${worker.id} disconnected`);

      const info = Object(worker).__info__ || {} as WorkerInfo;
      info.state = WorkerState.disconnected;
    });

    cluster.on("listening", (worker) => {
      log(`worker ${worker.id} listening`);
      const info = Object(worker).__info__ as WorkerInfo;
      info.state = WorkerState.listening;
    });

    cluster.on("message", (worker, msg) => {
      log(`worker ${worker.id} ${msg.data?.msg}:`, msg);

      const info = Object(worker).__info__ as WorkerInfo;
      info.lastUpdate = Date.now();

      clusterDispatch(msg);
    });

    cluster.on("exit", (worker, code, signal) => {
      log(`worker ${worker.id} died. exit code: ${code} signal: ${signal}`);

      let restarting = false;
      const info = Object(worker).__info__ as WorkerInfo;
      const app = apps[info.idx];
      delete Object(worker).__info__;

      if (!code && app.autorestart) {
        if (info.restarts < app.max_restarts) {
          restarting = true;
          const timeout = app.restart_delay + app.exp_backoff_restart_delay * info.restarts;
          log(`Reastrting ${worker.id} in ${timeout} ms`);
          setTimeout(() => { clusterFork(apps[info.idx], info.idx, info.restarts + 1); }, timeout);
        } else {
          log(`Wroker ${worker.id} too many restarts`);
        }
      }

      const live = Object.keys(cluster.workers).length;
      if (!restarting && live <= 1) {
        log("No more live workers. exiting...");
        process.exit(0);
      }
    });

    // Note for nodemon: Use nodemon --signal SIGTERM
    process.on("SIGTERM", clusterDestroy);
    process.on("SIGINT", clusterDestroy);

    // initialize bridge master
    bridge = initMaster(new Bridge({
      clientId: "master",
      send: clusterDispatch,
      onPkt: (cb: (packet: Packet) => void) => process.on("message", cb),
    }));
    bridge.addCallback(clusterApmHandler.bind(bridge));

    // ping-pong myself - - just to make sure we're on
    const resp = await bridge.send("ping", "master");
    logger.assert(!resp.error && resp.msg === "pong");


    // load apps
    if (!Array.isArray(arr) || !arr.length) {
      logger.error("Config invalid");
      return errno.EBADMSG;
    }

    arr.forEach((conf: WorkerConf) => apps.push(new WorkerConf(conf)));

    // Fork workers
    apps.forEach((app, idx) => {
      for (let i = 0; i < app.instances; i++) {
        clusterFork(app, idx);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    interval = setInterval(clusterMaint, WorkerConf.KILL_TIMEOUT / 2).unref();
    return 0;
  }
}

