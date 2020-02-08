/* eslint-disable @typescript-eslint/no-explicit-any */
/*** import { coralogixLog } from './coralogix'; ***/
// this num must needs to match with CoralogixLogger.Severity
export enum LogLevel {debug = 1, trace = 2, info = 3,  warn = 4, error = 5, critical = 6}

function consoleLogger(appName: string) {

  return (level: LogLevel, ...params: Array<any>) => {

    let lvl = `[${appName}]`;
    let logger = console.error;
    switch (level) {
      case LogLevel.debug: logger = console.debug; break;
      case LogLevel.trace: logger = console.trace; break;
      case LogLevel.info: logger = console.info; break;
      case LogLevel.warn: logger = console.warn; break;
      case LogLevel.error: break;
      default: lvl = '[CRITICAL]';
    }

    logger(lvl, ...params);
  };
}

class Logger {

  private readonly logger: (level: LogLevel, ...params: Array<any>) => void;

  constructor(module: string, private level = LogLevel.trace) {
    this.logger = /*** (process.env.CORALOGIX_APIKEY) ? coralogixLog(module) : ***/ consoleLogger(module);
  }

  setLevel(level: LogLevel): LogLevel {
    const lvl = this.level;
    this.level = level;
    return lvl;
  }

  debug(...params: Array<any>) {
    if (this.level <= LogLevel.debug) {
      this.logger(LogLevel.debug, ...params);
    }
  }

  trace(...params: Array<any>) {
    if (this.level <= LogLevel.trace) {
      this.logger(LogLevel.trace, ...params);
    }
  }

  info(...params: Array<any>) {
    if (this.level <= LogLevel.info) {
      this.logger(LogLevel.info, ...params);
    }
  }

  warn(...params: Array<any>) {
    if (this.level <= LogLevel.warn) {
      this.logger(LogLevel.warn, ...params);
    }
  }

  error(...params: Array<any>) {
    if (this.level <= LogLevel.error) {
      this.logger(LogLevel.error, ...params);
    }
  }

  critical(...params: Array<any>) {
    if (this.level <= LogLevel.critical) {
      this.logger(LogLevel.critical, ...params);
    }
  }

  assert(cond: boolean, ...params: Array<any>) {
    if (!(cond)) {
      if (process.env.DEBUG) {
        throw new Error('[ASSERTION FAILED]');
      }
      this.logger(LogLevel.critical, '[ASSERTION FAILED]', ...params);
    }
  }
}

// global logger is initialized on first call to getLogger()
let logger: Logger;

export function getLogger(logName = '', level = LogLevel.warn) {

  if (!logger) {
    logger = new Logger(`${logName || process.env.APP_NAME || 'unknown'}`, level);
  }

  return (logName) ? new Logger(`${logName}`, level) : logger;
}

// shorthands to global logger
export const trace = (...params: Array<any>) => { getLogger().trace(...params); };
export const debug = (...params: Array<any>) => { getLogger().debug(...params); };
export const info = (...params: Array<any>) => { getLogger().info(...params); };
export const warn = (...params: Array<any>) => { getLogger().warn(...params); };
export const error = (...params: Array<any>) => { getLogger().error(...params); };
export const critical = (...params: Array<any>) => { getLogger().critical(...params); };
export const assert = (cond: boolean, ...params: Array<any>) => { getLogger().assert(cond, ...params); };
