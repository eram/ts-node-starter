import cluster from "cluster";
import { initMaster } from "./master";
import { apm, assert, getLogger, info } from "../../utils";
import { LocalMaster } from "./localMaster";
import * as os from "os";
import { Bridge, Packet, PktData } from "./bridge";


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
      clientId: cluster.worker.id,
      send: (packat: Packet) => process.send(packat),     // send to cluster
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
        data.msg = "pong";
        data.cpu = Math.ceil(100 * os.loadavg()[0]); // last minute avg CPU for this core. process.cpuUsage()
        const mem = process.memoryUsage();
        data.mem = Math.ceil((mem.rss + mem.heapUsed + mem.external) / 1024 / 1024); // in MB
        break;

      case "signal":
        const value = data.value ? String(data.value) : "SIGINFO";
        data.value = undefined;
        try {
          const code: unknown = data.code ? Number(data.code) : undefined;
          process.emit(value as NodeJS.Signals, code as NodeJS.Signals);
        } catch (err) {
          data.error = err.message || err;
        }
        break;

      case "apm":
        data.apm = { counters: apm.counters, meters: apm.meters, histograms: apm.histograms };
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

