/* eslint-disable @typescript-eslint/no-explicit-any */
/* import { coralogixLog } from './coralogix'; */
// this enum must match with CoralogixLogger.Severity
export enum LogLevel { debug = 1, trace = 2, info = 3, warn = 4, error = 5, critical = 6 }
export type ILogFn = (level: LogLevel, ...params: any[]) => void;

function consoleLogger(_ctx: string) {

  const addTime = (process.env.LOG_ADD_TIME && process.env.LOG_ADD_TIME !== 'false');
  const ctx = (_ctx && _ctx.length)? `[${_ctx}]` : '';

  return (level: LogLevel, ...params: any[]) => {

    let prefix = addTime? `${(new Date()).toISOString() + ' ' + ctx}` : ctx;
    let logger = console.error;
    switch (level) {
      case LogLevel.debug: logger = console.debug; break;
      case LogLevel.trace: logger = console.trace; break;
      case LogLevel.info: logger = console.info; break;
      case LogLevel.warn: logger = console.warn; break;
      case LogLevel.error: break;
      default: prefix = '[CRITICAL]';
    }

    logger(prefix, ...params);
  };
}

class Logger {

  private readonly logger: (level: LogLevel, ...params: any[]) => void;

  constructor(module: string, private level: LogLevel, logger: ILogFn = undefined) {
    this.logger = logger || consoleLogger(module);
  }

  setLevel(level: LogLevel): LogLevel {
    const lvl = this.level;
    this.level = level;
    return lvl;
  }

  debug(...params: any[]) {
    if (this.level <= LogLevel.debug) {
      this.logger(LogLevel.debug, ...params);
    }
  }

  trace(...params: any[]) {
    if (this.level <= LogLevel.trace) {
      this.logger(LogLevel.trace, ...params);
    }
  }

  info(...params: any[]) {
    if (this.level <= LogLevel.info) {
      this.logger(LogLevel.info, ...params);
    }
  }

  warn(...params: any[]) {
    if (this.level <= LogLevel.warn) {
      this.logger(LogLevel.warn, ...params);
    }
  }

  error(...params: any[]) {
    if (this.level <= LogLevel.error) {
      this.logger(LogLevel.error, ...params);
    }
  }

  critical(...params: any[]) {
    if (this.level <= LogLevel.critical) {
      this.logger(LogLevel.critical, ...params);
    }
  }

  assert(cond: boolean, ...params: any[]) {
    if (!(cond)) {
      if (process.env.DEBUG) {
        throw new Error('[ASSERTION FAILED]');
      }
      this.logger(LogLevel.critical, '[ASSERTION FAILED]', ...params);
    }
  }
}

const logmap = new Map<string, Logger>();

export function getLogger(logName = '', level = LogLevel.warn, logger: ILogFn = undefined) {

  let log = logmap.get(logName);
  if (!log) {
    log = new Logger(logName, level, logger);
    logmap.set(logName, log);
  }
  return log;
}

// shorthands to global logger
export const trace = (...params: any[]) => { getLogger().trace(...params); };
export const debug = (...params: any[]) => { getLogger().debug(...params); };
export const info = (...params: any[]) => { getLogger().info(...params); };
export const warn = (...params: any[]) => { getLogger().warn(...params); };
export const error = (...params: any[]) => { getLogger().error(...params); };
export const critical = (...params: any[]) => { getLogger().critical(...params); };
export const assert = (cond: boolean, ...params: any[]) => { getLogger().assert(cond, ...params); };
