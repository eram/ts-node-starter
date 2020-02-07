// config.ts
// This file must be loaded as first file in the running project to setup ENV
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import minimist, { ParsedArgs } from 'minimist';
import * as os from 'os';
import * as path from 'path';
import { isBuffer } from 'util';
import { getLogger, LogLevel } from './logger';

class Config {
  args: ParsedArgs = minimist(process.argv.slice(0));
  isDebuging = process.execArgv.join().includes('inspect');

  constructor() {

    // load .env and push it to process.env
    let env = dotenv.config({
      path: process.env.DOTENV_CONFIG_PATH || this.args.dotenv,
      debug: !!process.env.DEBUG
    });

    if (env.error) {
      const def = './config/.developement.env';
      console.warn(`.env not found. loading ${def}`);
      env = dotenv.parse(fs.readFileSync(def));
    }

    for (const k in env) {
      if (k) { process.env[k] = (env as NodeJS.ProcessEnv)[k]; }
    }

    process.env.PORT = process.env.PORT || '80';

    // get app name and version from project.json
    const p = path.resolve(process.cwd(), './package.json');
    let pkg = JSON.parse('{}');
    try {
      const buf = fs.readFileSync(p);
      if (buf && isBuffer(buf)) {
        pkg = JSON.parse(buf.toString());
      }
    } catch (e) {
      console.error(e);
    }

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

    const hostname = os.hostname();
    if (!process.env.HOSTNAME) {
      process.env.HOSTNAME = hostname;
    }

    // initialize global logger
    // set log=level based on command-line option '--logLevel' or from env.LOG_LEVEL
    const lvlStr: string = this.args.logLevel || process.env.LOG_LEVEL || 'info';
    let level = LogLevel.debug;
    for (; level < LogLevel.critical; level++) { if (LogLevel[level] === lvlStr) { break; } }
    const logger = getLogger();
    if (!process.env.NODE_DEBUG) {
      process.env.NODE_DEBUG = '*';
    }

    // make sure this gets logged regardless of level
    logger.setLevel(LogLevel.info);
    logger.info(`App: ${process.env.APP_NAME}, version: ${version}`);
    logger.info(`Host: ${process.env.HOSTNAME}, Process: ${process.pid}`);
    logger.info('Node:', process.version);
    logger.info('NODE_ENV:', process.env.NODE_ENV);  // "production"
    logger.info('isDebugging:', this.isDebuging);
    logger.info('logLevel:', lvlStr);

    logger.setLevel(level);
    logger.debug('args:', this.args);
    logger.debug('env:', env);
  }
}

export const config = new Config();
