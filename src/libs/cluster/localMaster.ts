import { EventEmitter } from "events";
import { apm, getLogger } from "../../utils";
import { Bridge, BridgeError, Packet, PktData } from "./bridge";

// when running the client not in a cluster worker, initialize a local master that is
// based on an EventEmitter (see code in bridge:initClient)

export class LocalMaster {

  bus: EventEmitter;
  master: Bridge;
  client: Bridge;

  constructor() {

    const logger = getLogger("LocalMaster");
    this.bus = new EventEmitter();
    this.bus.on("error", logger.error.bind(logger));

    this.master = new Bridge({
      id: "master",
      send: (packet: Packet) => {
        // source must be master
        if (packet._source !== "master") {
          throw new BridgeError("packet source must be master");
        }
        // master should not sent to master
        if (packet._dest === "master") {
          throw new BridgeError("packet dest cannot be master");
        }
        // send bcast only to client 0
        if (packet._dest === "bcast") {
          packet = new Packet(packet._source, 0, packet._data, packet._shouldReply, packet._pktId);
        }
        setImmediate((pkt) => this.bus.emit("clnt", pkt), packet);
      },
      onPkt: (cb: (packet: Packet) => void) => this.bus.on("master", cb),
    }, logger);

    // initialize a client on the same EventEmitter
    this.client = new Bridge({
      id: 0,
      send: (packet: Packet) => {
        // source must be master
        if (packet._source !== 0) {
          throw new BridgeError("packet source must be 0");
        }
        // client should not send to itself
        if (packet._dest === 0) {
          throw new BridgeError("packet dest cannot be this client");
        }
        setImmediate((pkt) => this.bus.emit("master", pkt), packet);
      },
      onPkt: (cb: (packet: Packet) => void) => this.bus.on("clnt", cb),
    }, getLogger());
  }

  static apmHandler(data: PktData, reply: (data: PktData) => void) {
    if (data.msg !== "apm") return false;

    data.apm = apm.getAll();
    reply(data);
    return true;
  }

}
