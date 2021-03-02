import * as path from "path";
import cluster from "cluster";
import * as os from "os";
import { initMaster } from "./master";
import { apm, assert, error, getLogger, info, ROJO } from "../../utils";
import { LocalMaster } from "./localMaster";
import { Bridge, Packet, PktData } from "./bridge";
import { InitPluginFn } from "./plugin";
import { initDb } from "../../models";


function isWorker() {
  const rc = cluster.isWorker && !process.env.BRIDGE_TESTING;
  if (rc) {
    assert(cluster.worker.id >= 0);
    assert(!!process.send);
  }
  return rc;
}


//
// client can be initialized in two ways:
// 1- as a client talking with cluster. master is ran from cluster-bridge.
// 2- as a standalone client. client inializes a "local master".
//
export function initClient(): Bridge {

  let client: Bridge;

  if (isWorker()) {

    // initialize a client to cluster
    client = new Bridge({
      id: cluster.worker.id,
      send: (packat: Packet) => process.send(packat), // send to cluster
      onPkt: (cb: (packet: Packet) => void) => process.on("message", cb),
    }, getLogger());

  } else {

    // when we're running the client not on a cluster-master we initialize a local master.
    const bus = new LocalMaster();
    initMaster(bus.master);
    bus.master.addCallback(LocalMaster.apmHandler.bind(bus.master));
    client = bus.client;

    if (process.env.BRIDGE_TESTING) {
      // hack for unit testing: memory leak here!
      Object(client).master = bus.master;
    }
  }

  // intialize the client with the default onPacket function
  // this can be replaced to provide more comprehensive messeging

  const defaultClientHandler = (data: PktData, reply: (data: PktData) => void): boolean => {

    info("defaultClientHandler:", data.msg);

    switch (data.msg) {

      case "ping":
        {
          data.msg = "pong";
          data.cpu = Math.ceil(100 * os.loadavg()[0]); // last minute avg CPU for this core.
          const mem = process.memoryUsage();
          data.mem = Math.ceil((mem.rss + mem.heapUsed + mem.external) / 1024 / 1024); // in MB
        }
        break;

      case "plugin":
        {
          const value = String(data.value);
          delete data.value;
          try {
            const filename = path.resolve(value);
            const mod = require(filename) as { initPlugin: InitPluginFn };  // eslint-disable-line
            void mod.initPlugin({ db: initDb(), bridge: client });
          } catch (err) {
            error(err);
            data.error = err.message || err;
          }
        }
        break;

      case "signal":
        try {
          const sig = String(data.value || "SIGINFO");
          data.value = undefined;
          if (sig === "SIGTERM") {
            process.exit(0);
          } else {
            process.emit(sig as NodeJS.Signals, sig as NodeJS.Signals);
          }
        } catch (err) {
          data.error = err.message || err;
        }
        break;

      case "apm":
        // we cannot send the real objects to the master, only POJOs
        try {
          data.apm = ROJO({ counters: apm.counters, meters: apm.meters, histograms: apm.histograms });
        } catch (err) {
          error("data.apm POJO error", err);
        }
        break;

      default:
        return false; // ket some other callback handle this
    }

    reply(data);
    return true;
  };

  client.addCallback(defaultClientHandler);
  return client;
}
