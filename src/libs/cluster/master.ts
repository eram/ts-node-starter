import * as path from "path";
import * as os from "os";
import { Bridge, PktData } from "./bridge";
import { info, error } from "../../utils";
import { initDb } from "../../models";
import { InitPluginFn } from "./plugin";

function defaultMasterHandler(data: PktData, reply: (data: PktData) => void) {

  info(`defaultMasterHandler: ${data.msg}`);

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
      try {
        const value = String(data.value);
        delete data.value;
        const filename = path.resolve(value);
        const mod = require(filename) as { initPlugin: InitPluginFn };  // eslint-disable-line
        void mod.initPlugin({ db: initDb(), bridge: this });
      } catch (err) {
        error(err);
        data.error = err.message || err;
      }
      break;

    case "signal":
      try {
        const signal = (data.value ? String(data.value) : "SIGINFO") as NodeJS.Signals;
        delete data.value;
        const code = (data.code ? Number(data.code) : undefined) as unknown as NodeJS.Signals;
        process.emit(signal, code);
      } catch (err) {
        data.error = err.message || err;
      }
      break;

    default:
      return false;
  }

  reply(data);
  return true;
}

export function initMaster(bridge: Bridge) {
  bridge.addCallback(defaultMasterHandler.bind(bridge));
  info("bridge master initialized");
  return bridge;
}
