//! !! DO NOT IMPORT from ".ENV"
import { format } from "util";
import * as cluster from "cluster";
import process from "process";
import { grey, blueBright, red } from "chalk";
import assertMod, { fail, ok, strictEqual, deepStrictEqual, notDeepStrictEqual, throws, doesNotThrow, ifError, rejects, doesNotReject, strict } from "assert";
import { IDictionary, POJO } from "./pojo";

// TODO: consider using npm log-buffer to improve logger performance

// hack to workaround https://github.com/microsoft/TypeScript/issues/36931
type AssertT = {
  fail: typeof fail,
  ok: typeof ok,
  strictEqual: typeof strictEqual,
  deepStrictEqual: typeof deepStrictEqual,
  notDeepStrictEqual: typeof notDeepStrictEqual,
  throws: typeof throws,
  doesNotThrow: typeof doesNotThrow,
  ifError: typeof ifError,
  rejects: typeof rejects,
  doesNotReject: typeof doesNotReject,
  strict: typeof strict,
} & ((value: boolean, message?: string) => void);


// this enum must match with CoralogixLogger.Severity
export enum LogLevel { debug = 1, trace = 2, info = 3, warn = 4, error = 5, critical = 6 }
export type ILogFn = (level: LogLevel, ...params: unknown[]) => void;

let hooked: IDictionary<(message?: unknown, ...optionalParams: unknown[]) => void>;
const logmap = new Map<string, Logger>();

function rawLogger(_ctx: string) {

  const addTime = (process.env.LOG_ADD_TIME && process.env.LOG_ADD_TIME !== "false");
  const ctx = (_ctx && _ctx.length) ? `[${_ctx}] ` : "";
  const { assert, debug, trace, info, warn, error } = (hooked) || console;
  const logFns = [assert, debug, trace, info, warn, error, error];
  const chalks = [red, grey, grey, blueBright, blueBright, red, red];

  return (level: LogLevel, ...params: unknown[]) => {
    const prefix = chalks[level](`${(addTime ? `${(new Date()).toISOString()} ` : "")}${ctx}${params[0]}`);
    params[0] = prefix;
    logFns[level](...params);
  };
}

function jsonLogger(_ctx: string) {
  const addTime = (process.env.LOG_ADD_TIME && process.env.LOG_ADD_TIME !== "false");
  const { assert, debug, trace, info, warn, error } = (hooked) || console;
  const logFns = [assert, debug, trace, info, warn, error, error];

  return (level: LogLevel, ...params: unknown[]) => {
    const out: POJO = {
      message: format(...params),       // the actual message that has been `console.log`
      type: level < LogLevel.error ? "out" : "err",
      process_id: process.pid,          // eslint-disable-line
      app_name: process.env.APP_NAME,   // eslint-disable-line
    };

    if (addTime) { out.timestamp = (new Date()).toISOString(); }
    if (_ctx) { out.ctx = _ctx; }

    logFns[level](out);
  };
}

export class Logger {

  protected constructor(module: string,
    private _level: LogLevel,
    private readonly _logFn?: ILogFn) {
    if (!_logFn) {
      const { argv } = process;
      const json = (process.env.LOG_FORMAT === "json" || argv.includes("-json") || argv.includes("--json"))
      && !(argv.includes("-raw") || argv.includes("--raw"));
      this._logFn = json ? jsonLogger(module) : rawLogger(module);
    }
  }

  static getLogger(logName = "", level = LogLevel.warn, logger: ILogFn = undefined) {

    logName = logName || (cluster.isWorker ? cluster.worker.id.toString() : "");

    let log = logmap.get(logName);
    if (!log) {
      log = new Logger(logName, level, logger);
      logmap.set(logName, log);
    }
    return log;
  }

  set level(level: LogLevel) {
    this._level = level;
  }

  get level() { return this._level; }

  debug(...params: unknown[]) {
    if (this._level <= LogLevel.debug) {
      this._logFn(LogLevel.debug, ...params);
    }
  }

  trace(...params: unknown[]) {
    if (this._level <= LogLevel.trace) {
      this._logFn(LogLevel.trace, ...params);
    }
  }

  info(...params: unknown[]) {
    if (this._level <= LogLevel.info) {
      this._logFn(LogLevel.info, ...params);
    }
  }

  warn(...params: unknown[]) {
    if (this._level <= LogLevel.warn) {
      this._logFn(LogLevel.warn, ...params);
    }
  }

  error(...params: unknown[]) {
    if (this._level <= LogLevel.error) {
      this._logFn(LogLevel.error, ...params);
    }
  }

  critical(...params: unknown[]) {
    this._logFn(LogLevel.critical, ...params);
  }

  assert: AssertT = assertMod;
}


// shorthands to global logger
export const getLogger = Logger.getLogger;
const gLogger = getLogger();
export const trace = gLogger.trace.bind(gLogger);
export const debug = gLogger.debug.bind(gLogger);
export const info = gLogger.info.bind(gLogger);
export const log = gLogger.info.bind(gLogger);
export const warn = gLogger.warn.bind(gLogger);
export const error = gLogger.error.bind(gLogger);
export const critical = gLogger.critical.bind(gLogger);
export const assert = gLogger.assert;


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
    Object(con).trace = hooked.trace;
    Object(con).debug = hooked.debug;
    Object(con).info = hooked.info;
    Object(con).log = hooked.log;
    Object(con).warn = hooked.warn;
    Object(con).error = hooked.error;
    Object(con).critical = hooked.critical;
    Object(con).assert = hooked.assert;
    hooked = undefined;
  }
}
