// config.ts
// This file must be loaded as first file in the running project to setup ENV
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getLogger, LogLevel } from './logger';

class Config {

  readonly production = (process.env.NODE_ENV === 'production');
  readonly isDebuging = process.execArgv.join().includes('inspect');
  readonly isPm2Instance = process.env.PM2_INSTANCE != undefined;

  constructor() {
    // load default env and push it to process.env
    let fn = path.resolve(process.cwd(), './env.defaults.json');
    if (!fs.existsSync(fn)) {
      throw new Error(`missing config file: ${fn}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const env = require(fn);
    for (const k in env) {
      if (k && !process.env[k]) {
        process.env[k] = (env as NodeJS.ProcessEnv)[k];
      }
    }

    // get app name and version from package.json
    fn = path.resolve(process.cwd(), './package.json');
    if (!fs.existsSync(fn)) {
      throw new Error(`missing config file: ${fn}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const pkg = require(fn);

    if (!process.env.APP_NAME) {
      let name = 'unknown';
      if (pkg && pkg.name) {
        name = String(pkg.name);
      }
      process.env.APP_NAME = name;
    }

    let version = '0.0.0';
    if (pkg && pkg.version) {
      version = String(pkg.version);
    }

    // PM2 instance
    process.env.PM2_INSTANCE = process.env.PM2_INSTANCE || '0';
    const instance = Number(process.env.PM2_INSTANCE);

    const hostname = os.hostname();
    if (!process.env.HOSTNAME) {
      process.env.HOSTNAME = hostname;
    }

    // initialize global logger
    process.env.LOG_ADD_TIME = process.env.LOG_ADD_TIME || 'false';
    const lvlStr: string = process.env.LOG_LEVEL || 'info';
    let level = LogLevel.debug;
    for (; level < LogLevel.critical; level++) { if (LogLevel[level] === lvlStr) { break; } }
    const logger = getLogger();

    // make sure this gets logged regardless of level
    logger.setLevel(LogLevel.info);
    logger.info(`App: ${process.env.APP_NAME}, version: ${version}`);
    logger.info(`Host: ${process.env.HOSTNAME}, Process: ${process.pid}, PM2 instance: ${this.isPm2Instance? instance: '-'}`);
    logger.info('Node:', process.version);
    logger.info('NODE_ENV:', process.env.NODE_ENV);  // "production"
    logger.info('isDebugging:', this.isDebuging);
    logger.info('logLevel:', lvlStr);

    logger.setLevel(level);
    logger.debug('args:', process.execArgv);
    logger.debug('env:', process.env);
  }
}

export const config = new Config();
