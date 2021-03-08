/* istanbul ignore file */
// testing cluster functionality is out of scope for this project.

import cluster from "cluster";
import * as fs from "fs";
import path from "path";
import { apm, AsyncArray, count, Counter, env, errno, getLogger, Histogram, LogLevel, Meter, POJO } from "../../utils";
import { Bridge, BridgeError, Packet, PktData, PKT_TOPIC } from "./bridge";
import { initMaster } from "./master";
import { WorkerConf, WorkerInfo, WorkerState } from "./workerConf";


const logger = getLogger("Cluster", LogLevel.info);
const info = logger.info.bind(logger);
const warn = logger.warn.bind(logger);
const error = logger.error.bind(logger);
const assert = logger.assert;
const apps = new Array<WorkerConf>();
let interval: NodeJS.Timeout;
let bridge: Bridge;
let clusterStopping = false;

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
        Object.keys(cluster.workers).forEach(k => {
          const worker = cluster.workers[k];
          if (pkt._source !== worker.id) {
            const pkt2 = new Packet(pkt._source, worker.id, pkt._data);
            clusterDispatch(pkt2);
          }
        });
        // reply to caller
        if (pkt._shouldReply) {
          const pkt2 = new Packet("master", pkt._source, pkt._data, pkt._shouldReply, pkt._pktId);
          clusterDispatch(pkt2);
        }
        break;

      default:
        // send to another process
        Object.keys(cluster.workers).forEach(k => {
          const worker = cluster.workers[k];
          if (pkt._dest === worker.id) {
            worker.send(pkt, undefined, (err: BridgeError) => {
              if (err) {
                error("clusterDispatch failed:", err);
              }
            });
          }
        });
    } // switch
  } catch (err) {
    error("clusterDispatch", err.stack || err);
  }
}


function getInfo(worker: cluster.Worker) {
  return Object(worker).__info__ as WorkerInfo;
}

function clusterApmHandler(data: PktData, reply: (data: PktData) => void) {
  if (data.msg !== "apm") return false;

  const waitFor: Promise<PktData>[] = [];
  let apmErrors = 0;
  apm.reset(true);

  Object.keys(cluster.workers).forEach(k => {
    const inf = getInfo(cluster.workers[k]);
    count(`cluster.workers.${WorkerState[inf.state]}`);
    if (!inf || inf.state !== WorkerState.pinging) return;
    waitFor.push(bridge.send("apm", cluster.workers[k].id));
  });

  Promise.allSettled(waitFor).then(values => {
    values.forEach(value => {
      if (value.status === "fulfilled") {
        const pkt = value.value;
        assert(pkt.msg === "apm");
        if (pkt.error || typeof pkt.apm !== "object") {
          error("apm response error", pkt.error);
          apmErrors++;
        } else {
          const pktApm = pkt.apm;
          Object.keys(pktApm).forEach((type) => {
            Object.keys(pktApm[type]).forEach((key) => {
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
                  error("apm: unnkown counter type:", type);
              }
            });
          });
        }
      } else {
        // rejected / timeout??
        error("apm response rejected:", value.reason);
        apmErrors++;
      }
    });
  }, err => {
    // we should not get here...
    error("allSettled error:", err);
    apmErrors++;
  }).catch(err => {
    // we should not get here either...
    error("allSettled catch:", err);
    apmErrors++;
  }).finally(() => {
    if (apmErrors) count("cluster.apmErrors", apmErrors);
    data.apm = apm.getAll();
    reply(data);
  });

  return true;
}


function clusterStop(signal: NodeJS.Signals) {
  info("cluster stopping on", signal);

  clusterStopping = true;
  if (interval) clearInterval(interval);
  interval = undefined;

  // prevent EPIPE errors when process goes down
  process.stdout.on("error", err => {
    if (err.code === "EPIPE") {
      process.exit(0);
    }
  });

  Object.keys(cluster.workers).forEach(k => {
    const worker = cluster.workers[k];
    const inf = getInfo(worker);
    const app = apps[inf.idx];

    if (app.shutdown_with_message && info.state === WorkerState.pinging) {
      info(`worker ${worker.id}: ${signal}`);
      const msg: PktData = { msg: "signal", value: signal };
      bridge.post(msg, worker.id);
    } else {
      info(`worker ${worker.id}: destroy`);
      worker.destroy(signal);
      // we want to see the cluster on "exit" so we can cleanup
      cluster.emit("exit", worker, 0, signal);
    }
  });

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
    Object.keys(cluster.workers).forEach(k => {
      cluster.workers[k].process.kill();
    });
    process.exit(0);
  }, WorkerConf.WD_CHECK_INTERVAL).unref();
}


async function workerCheck(worker: cluster.Worker) {

  try {
    const inf = getInfo(worker);
    const app = apps[inf.idx];

    // ping worker
    const pkt = await bridge.send("ping", worker.id);
    assert(pkt.msg === "pong");

    // check health
    if (!!app.max_memory_restart && Number(pkt.mem) > app.max_memory_restart && inf.lastMem > app.max_memory_restart) {
      info(`worker ${worker.id} memory twice over max: ${pkt.mem} MB`);
      return false;
    }
    if (Number(pkt.cpu >= 99) && inf.lastCpu >= 99) {
      info(`worker ${worker.id} CPU twice over max: ${pkt.cpu}%`);
      return false;
    }

    inf.state = WorkerState.pinging;
    inf.lastCpu = Number(pkt.cpu);
    inf.lastMem = Number(pkt.mem);
  } catch (err) {
    // if the worker is not implementing the bridge all the pings send will timeout.
    // this does not mean the worker is unhealthy. the worker state will remain online/listening.
    info(`ping to worker ${worker.id} did not answer.`, err.stack || err);
  }
  return true;
}


async function clusterMaint() {

  const toKill: cluster.Worker[] = [];

  const arr = new AsyncArray(...Object.keys(cluster.workers));
  await arr.asyncForEach(async (k) => {
    const worker = cluster.workers[k];
    const inf = getInfo(worker);
    if (!inf) return;
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
        /* fall through */

      case WorkerState.listening:
        // try to ping worker
        if (!await workerCheck(worker)) {
          warn(`worker ${worker.id} healthcheck failed`);
          toKill.push(worker);
        }
        break;

      case WorkerState.disconnected:
      default:
        if (tDiff > WorkerConf.WD_TIMEOUT_RESTART) {
          warn(`worker ${worker.id} disconnected and still alive`);
          toKill.push(worker);
        }
        break;
    }
  });

  // dont kill workers while debugging...
  if (!env.isDebugging) {
    toKill.forEach(worker => {
      info(`terminating worker ${worker.id}`);
      worker.process.kill();
    });
  }
}


function clusterFork(app: WorkerConf, idx: number, restarts = 0) {

  if (clusterStopping) return;
  if (!fs.existsSync(app.script)) {
    error("'script' must be a js/ts file'");
    return;
  }

  const save1 = process.env.LOG_ADD_TIME;
  process.env.LOG_ADD_TIME = String(app.time);

  const save2 = process.env.APP_NAME;
  process.env.APP_NAME = `${process.env.APP_NAME}:${app.name}`;

  const saveCwd = process.cwd();
  process.chdir(app.cwd);

  cluster.setupMaster({
    execArgv: ["-r", "ts-node/register"], // required to fork typescript
    args: app.args.split(" "),
    exec: app.script,
    silent: false,                        // pipe stdout/stderr
  });
  const worker = cluster.fork();
  Object(worker).__info__ = new WorkerInfo(idx, restarts);

  process.env.LOG_ADD_TIME = save1;
  process.env.APP_NAME = save2;
  process.chdir(saveCwd);

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

  assert(cluster.isMaster, "cluster start must be run from a master node");
  info(`cluster starting on pid ${process.pid}...`);

  // restart previous cluster
  if (apps.length) {
    info("cluster restarting");
    clusterStop("SIGTERM");
    apps.length = 0;
  }

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

    let restarting = false;
    const inf = getInfo(worker);
    const app = apps[inf.idx];
    delete Object(worker).__info__;

    // 3221225786 >> STATUS_CONTROL_C_EXIT on Windows
    if (code === 3221225786) {
      code = 1;
      signal = "SIGINT";
    }

    info(`worker ${worker.id} died. exit code: ${code}, signal: ${signal}`);

    if ((!!code || !!signal) && app.autorestart && !clusterStopping) {
      if (app.max_restarts && inf.restarts < app.max_restarts) {
        restarting = true;
        const timeout = app.restart_delay + app.exp_backoff_restart_delay * (inf.restarts ** 2);
        info(`reastrting ${worker.id} in ${timeout} ms`);
        setTimeout(() => { clusterFork(apps[inf.idx], inf.idx, inf.restarts + 1); }, timeout);
      } else {
        info(`worker ${worker.id} too many restarts`);
      }
    }

    if (!restarting) {
      // give it a bit of time to let the buffers flush
      setTimeout(() => {
        const live = Object.keys(cluster.workers).length;
        if (live > 0) return;
        info("no more live workers. exiting...");
        process.exit(0);
      }, 500).unref();
    }
  }); // exit

  // Cluster can be stopped by SIGTERM or SIGINT.
  process.on("SIGTERM", clusterStop);
  process.on("SIGINT", clusterStop);

  // initialize bridge master
  bridge = initMaster(new Bridge({
    id: "master",
    send: clusterDispatch,
    onPkt: (cb: (packet: Packet) => void) => process.on("message", cb),
  }, logger));
  bridge.addCallback(clusterApmHandler.bind(bridge));

  // ping-pong myself - - just to make sure we're on :-)
  const resp = await bridge.send("ping", "master");
  logger.assert(!resp.error && resp.msg === "pong");

  // load apps
  if (!Array.isArray(arr) || !arr.length) {
    error("Invalid config");
    return errno.EBADMSG;
  }

  arr.forEach((conf: WorkerConf) => apps.push(new WorkerConf(conf)));

  // add a watchdog for cluster master (this process)
  const argv = [...process.argv];
  argv.shift();
  apps.push(new WorkerConf({
    name: "cluster watchdog",
    script: path.join(__dirname, "watchdog.ts"),
    args: argv.join(" "),
    instances: 1,
  }));

  // Fork workers
  apps.forEach((app, idx) => {
    for (let i = 0; i < app.instances; i++) {
      clusterFork(app, idx);
    }
  });

  interval = setInterval(() => { void clusterMaint(); }, WorkerConf.WD_TIMEOUT_RESTART / 2).unref();
  return 0;
}
