//! !! DO NOT IMPORT from ".ENV"
import { format } from "util";
import * as cluster from "cluster";
import process from "process";
import { grey, blueBright, red } from "chalk";
import { IDictionary, POJO } from "./pojo";
import { CustomError } from "./customError";

// TODO: consider using npm log-buffer to improve logger performance


// this enum must match with CoralogixLogger.Severity
export enum LogLevel { debug = 1, trace = 2, info = 3, warn = 4, error = 5, critical = 6 }
const chalks = [red, grey, grey, blueBright, blueBright, red, red];
const toHook = ["assert", "debug", "trace", "log", "info", "warn", "error"];
export type Logger = typeof console & { level: LogLevel, critical: (...params: unknown[]) => void };
const loggers = new Map<string, Logger>();
let hooked: IDictionary<(message?: unknown, ...optionalParams: unknown[]) => void>;

class AssertError extends CustomError { }

function defLevel() {
  // LOG_LEVEL can be a number 1-6 or a level string (e.g. "warn")
  let lvl = Number(process.env.LOG_LEVEL);
  if (!lvl) {
    for (lvl = 0; lvl < LogLevel.critical; lvl++) {
      if (LogLevel[lvl] === process.env.LOG_LEVEL) break;
    }
  }
  return lvl;
}


export const createLogger = (logName = "", level?: LogLevel, baseLogger?: typeof console): Logger => {

  logName ||= (cluster.isWorker ? cluster.worker.id.toString() : "");
  baseLogger ||= console;
  level ||= defLevel();

  const json = process.env.LOG_FORMAT === "json";
  const addTime = (process.env.LOG_ADD_TIME && process.env.LOG_ADD_TIME !== "false");
  const { assert, debug, trace, info, warn, error } = (baseLogger || hooked || console);
  const logFns = [assert, debug, trace, info, warn, error, error];

  function jsonFn(lvl: LogLevel, ...params: unknown[]) {
    if (lvl >= this.level) {
      const out: POJO = {
        message: format(...params),       // the actual message that has been `console.log`
        ctx: logName,
        type: lvl < LogLevel.error ? "out" : "err",
        process_id: process.pid,          // eslint-disable-line
        app_name: process.env.APP_NAME,   // eslint-disable-line
      };

      if (addTime) out.timestamp = new Date().toISOString();
      baseLogger.info(out);
    }
  }

  function rawFn(lvl: LogLevel, ...params: unknown[]) {
    if (lvl >= this.level) {
      const prefix = (addTime ? `${(new Date()).toISOString()} ` : "") + (logName ? `[${logName}]` : "");
      if (prefix) {
        logFns[lvl](chalks[lvl](prefix, format(...params)));
      } else {
        logFns[lvl](chalks[lvl](format(...params)));
      }
    }
  }

  function criticalFn(...params: unknown[]) {
    // critical() is not implemented in standard console
    const save = this.level;
    this.level = LogLevel.error;
    this.error(...params);
    this.level = save;
  }

  function assertFn(cond: boolean, message: string) {
    if (cond) return;
    throw new AssertError(message);
  }

  let log = loggers.get(logName);
  if (!log) {
    log = {
      ...baseLogger,
      level,
      critical: criticalFn,
    };
    toHook.forEach(key => {
      Object(log)[key] = (json ? jsonFn : rawFn).bind(log, Object(LogLevel)[key] || LogLevel.info);
    });
    log.critical = criticalFn.bind(log);
    log.assert = assertFn.bind(log);
    loggers.set(logName, log);
  }
  log.level = level;
  return log;
};


// shorthands to global logger
export const { trace, debug, info, log, warn, error, critical, assert } = createLogger();

export function hookConsole() {
  if (!hooked) {
    hooked = {};
    const con = globalThis.console || require("console");   // eslint-disable-line
    hooked.trace = Object(con).trace;
    Object(con).trace = trace;
    hooked.debug = Object(con).debug;
    Object(con).debug = debug;
    hooked.info = Object(con).info;
    Object(con).info = info;
    hooked.log = Object(con).log;
    Object(con).log = log;
    hooked.warn = Object(con).warn;
    Object(con).warn = warn;
    hooked.error = Object(con).error;
    Object(con).error = error;
    hooked.critical = Object(con).critical;
    Object(con).critical = critical;
    hooked.assert = Object(con).assert;
    Object(con).assert = assert;
    Object.freeze(hooked);
  }
}

export function unhookConsole() {
  if (hooked) {
    const con = globalThis.console || require("console");   // eslint-disable-line
    toHook.forEach(key => {
      Object(con)[key] = Object(hooked)[key];
    });
    Object(con).critical = hooked.critical;
    Object(con).assert = hooked.assert;
    hooked = undefined;
  }
}
