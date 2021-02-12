import * as cluster from "cluster";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as inspector from "inspector";
const pkg = require('../../package.json');  // eslint-disable-line
import { LogLevel, getLogger, hookConsole } from "./logger";

class LoadEnv {

  readonly nodeVer = parseFloat(process.version.substr(1, process.version.length));
  readonly version = pkg.version;
  readonly workerId = cluster.isWorker ? cluster.worker.id.toString() : "-";
  readonly releaseId = process.env.RELEASE_ID || "debug";

  constructor() {

    // console is mine!
    hookConsole();

    // validate node version
    console.assert(this.nodeVer > 14.0, "NodeJS version 14+ required");
    this.reload();
  }

  reload() {

    const env = process.env;

    // load .env according to environment with defual to .env
    env.NODE_ENV = env.NODE_ENV || "development";
    env.DOT_ENV_FILE = env.DOT_ENV_FILE || path.resolve(".env." + env.NODE_ENV);
    const dotenv = require('dotenv').config({       // eslint-disable-line
      path: fs.existsSync(env.DOT_ENV_FILE) ? env.DOT_ENV_FILE : undefined,
    });

    // must have env vars
    env.APP_NAME = env.APP_NAME || pkg.name;
    env.HOSTNAME = env.HOSTNAME || os.hostname();
    env.LOG_ADD_TIME = env.LOG_ADD_TIME || "false";
    env.LOG_LEVEL = env.LOG_LEVEL || "info";

    // initialize global logger
    // LOG_LEVEL can be a number 1-6 or a level string (e.g. "warn")
    let level = Number(env.LOG_LEVEL);
    if (!level) for (level = 0; level < LogLevel.critical; level++) {
      if (LogLevel[level] === env.LOG_LEVEL) break;
    }
    getLogger().setLevel(level);
  }


  print(logger = getLogger()) {
    const { APP_NAME, HOSTNAME, NODE_ENV, LOG_LEVEL } = process.env;
    logger.info(`
-----------------
App: ${APP_NAME}
Version: ${this.version}, ReleaseId: ${this.releaseId}
Host: ${HOSTNAME}, Node version: ${this.nodeVer}
Process: ${process.pid}, workerId: ${this.workerId}
NODE_ENV: ${NODE_ENV}, cwd: ${process.cwd()}
logLevel: ${LogLevel[Number(LOG_LEVEL)]}, isDebugging: ${this.isDebugging}
-----------------`);
  }


  get isDebugging() {
    return (typeof inspector.url() === "string") || !!process.env.JEST_WORKER_ID;
  }
}

export const env = new LoadEnv();