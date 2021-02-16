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
const info = logger.info.bind(logger);
const warn = logger.warn.bind(logger);
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


function getInfo(worker: cluster.Worker){
  return Object(worker).__info__ as WorkerInfo;
}


function clusterApmHandler(data: PktData, reply: (data: PktData) => void) {
  if (data.msg !== "apm") return false;

  const waitFor: Promise<PktData>[] = [];
  let apmErrors = 0;
  apm.reset(true);

  for (const k in cluster.workers) {
    const inf = getInfo(cluster.workers[k]);
    count(`cluster.workers.${WorkerState[inf.state]}`);
    if (!inf || inf.state !== WorkerState.pinging) continue;
    waitFor.push(bridge.send("apm", cluster.workers[k].id));
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
  info(`cluster stopping on ${signal}...`);

  if (interval) clearInterval(interval);
  interval = undefined;

  for (const i in cluster.workers) {
    const worker = cluster.workers[i];
    const inf = getInfo(worker);
    const app = apps[inf.idx];

    if (app.shutdown_with_message) {
      info(`wroker ${worker.id}: ${signal}`);
      worker.send(signal);
    } else {
      info(`wroker ${worker.id}: destroy`);
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
    info("clusterDestory timeout");
    process.exit(0);
  }, WorkerConf.KILL_TIMEOUT / 2).unref();
}


async function workerCheck(worker: cluster.Worker) {

  try {
    const inf = getInfo(worker);
    const app = apps[inf.idx];

    // ping worker
    const pkt = await bridge.send("ping", worker.id);
    logger.assert(pkt.msg === "pong");

    // check health
    if (!!app.max_memory_restart && Number(pkt.mem) > app.max_memory_restart && inf.lastMem > app.max_memory_restart) {
      info(`worker ${worker.id} memory over max: ${pkt.mem} MB`);
      return false;
    } else if (Number(pkt.cpu >= 99 && inf.lastCpu >= 99)) {
      info(`worker ${worker.id} CPU over max: ${pkt.cpu}%`);
      return false;
    }

    inf.state = WorkerState.pinging;
    inf.lastCpu = Number(pkt.cpu);
    inf.lastMem = Number(pkt.mem);
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
    const inf = getInfo(worker);
    if (!inf) continue;
    const app = apps[inf.idx];

    const tDiff = Date.now() - inf.lastUpdate;
    info(`worker ${worker.id} isDead=${worker.isDead()} info=${inf.idx}:${WorkerState[inf.state]} tDiff=${tDiff / 1000} sec`);

    if (worker.isDead()) {
      toKill.push(worker);
    }

    switch (inf.state) {

      case WorkerState.init:
      case WorkerState.online:
        if (app.wait_ready && tDiff > app.listen_timeout) {
          warn(`worker ${worker.id} listening timeout`);
          toKill.push(worker);
        }
        break;

      case WorkerState.pinging:
        if (!!app.kill_timeout && tDiff > app.kill_timeout) {
          warn(`worker ${worker.id} healthcheck timeout`);
          toKill.push(worker);
        }

        { } // fall through

      case WorkerState.listening:
        // try to ping worker
        if (!await workerCheck(worker)) {
          warn(`worker ${worker.id} healthcheck failed`);
          toKill.push(worker);
        }
        break;

      case WorkerState.disconnected:
      default:
        if (tDiff > WorkerConf.KILL_TIMEOUT) {
          warn(`worker ${worker.id} disconnected and still alive`);
          toKill.push(worker);
        }
        break;
    }
  }

  // dont kill workers while debugging...
  if (!env.isDebugging) {
    toKill.forEach(worker => {
      info(`terminating worker ${worker.id}`);
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
    silent: false,      // pipe stdout/stderr
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
    info(`cluster starting on pid ${process.pid}...`);

    // restart previous cluster
    if (apps.length) {
      info("cluster restarting");
      clusterDestroy("SIGTERM");
      apps.length = 0;
    }

    // Master can be terminated by either SIGTERM
    // or SIGINT. The later is used by CTRL+C on console.
    cluster.on("online", (worker) => {
      info(`worker ${worker.id} is online`);

      const inf = getInfo(worker);
      inf.state = WorkerState.online;
    });

    cluster.on("disconnect", (worker) => {
      info(`worker ${worker.id} disconnected`);

      const inf = getInfo(worker);
      inf.state = WorkerState.disconnected;
    });

    cluster.on("listening", (worker) => {
      info(`worker ${worker.id} listening`);
      const inf = getInfo(worker);
      inf.state = WorkerState.listening;
    });

    cluster.on("message", (worker, msg: Packet) => {
      info(`worker ${worker.id} ${msg._data?.msg}:`, msg);

      const inf = getInfo(worker);
      inf.lastUpdate = Date.now();

      clusterDispatch(msg);
    });

    cluster.on("exit", (worker, code, signal) => {
      info(`worker ${worker.id} died. exit code: ${code} signal: ${signal}`);

      let restarting = false;
      const inf = getInfo(worker);
      const app = apps[inf.idx];
      delete Object(worker).__info__;

      if (!!code && app.autorestart) {
        if (inf.restarts < app.max_restarts) {
          restarting = true;
          const timeout = app.restart_delay + app.exp_backoff_restart_delay * inf.restarts;
          info(`reastrting ${worker.id} in ${timeout} ms`);
          setTimeout(() => { clusterFork(apps[inf.idx], inf.idx, inf.restarts + 1); }, timeout);
        } else {
          info(`wroker ${worker.id} too many restarts`);
        }
      }

      const live = Object.keys(cluster.workers).length;
      if (!restarting && live <= 1) {
        info("no more live workers. exiting...");
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
    }, logger));
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

