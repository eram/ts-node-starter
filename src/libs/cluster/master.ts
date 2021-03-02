import * as path from "path";
import { Bridge, PktData } from "./bridge";
import { info, error } from "../../utils";
import { initDb } from "../../models";
import { InitPluginFn } from "./plugin";

function defaultMasterHandler(data: PktData, reply: (data: PktData) => void) {

  info(`defaultMasterHandler: ${data.msg}`);

  switch (data.msg) {
    case "ping":
      data.msg = "pong";
      break;

    case "plugin":
      {
        const value = String(data.value);
        delete data.value;
        try {
          const filename = path.resolve(value);
          const mod = require(filename) as { initPlugin: InitPluginFn };  // eslint-disable-line
          void mod.initPlugin({ db: initDb(), bridge: this });
        } catch (err) {
          error(err);
          data.error = err.message || err;
        }
      }
      break;

    case "signal":
      {
        const signal = data.value ? String(data.value) : "SIGINFO";
        delete data.value;
        try {
          const code: unknown = data.code ? Number(data.code) : undefined;
          process.emit(signal as NodeJS.Signals, code as NodeJS.Signals);
        } catch (err) {
          data.error = err.message || err;
        }
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
