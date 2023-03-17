/* eslint-disable global-require */
import * as cluster from "cluster";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as inspector from "inspector";
import { LogLevel, createLogger, hookConsole } from "./logger";

const pkg = require("../../package.json");

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
    const { env, argv } = process;

    // load .env according to environment with defual to .env
    env.NODE_ENV = env.NODE_ENV || "development";
    env.DOT_ENV_FILE = env.DOT_ENV_FILE || path.resolve(`.env.${env.NODE_ENV}`);
    require("dotenv").config({
      path: fs.existsSync(env.DOT_ENV_FILE) ? env.DOT_ENV_FILE : undefined,
    });

    // must have env vars
    env.APP_NAME = env.APP_NAME || pkg.name;
    env.HOSTNAME = env.HOSTNAME || os.hostname();
    env.LOG_ADD_TIME = env.LOG_ADD_TIME || "false";
    env.LOG_LEVEL = env.LOG_LEVEL || "info";
    env.LOG_FORMAT = env.LOG_FORMAT
    || ((argv.includes("-json") || argv.includes("--json"))
    && !(argv.includes("-raw") || argv.includes("--raw"))) ? "json" : "raw";
  }

  print(logger = createLogger()) {
    const save = logger.level;
    logger.level = LogLevel.info;
    const { APP_NAME, HOSTNAME, NODE_ENV, POD_NAME, POD_NAMESPACE } = process.env;
    logger.info(`
-----------------
app: ${APP_NAME},
version: ${this.version}, releaseId: ${this.releaseId},
namespace: ${POD_NAMESPACE}, pod: ${POD_NAME},
host: ${HOSTNAME}, node: ${this.nodeVer},
pid: ${process.pid}, workerId: ${this.workerId},
NODE_ENV: ${NODE_ENV}, cwd: ${process.cwd()},
logLevel: ${LogLevel[save]}, isDebugging: ${this.isDebugging},
-----------------`);
    logger.level = save;
  }


  get isDebugging() {
    return (typeof inspector.url() === "string") || !!process.env.JEST_WORKER_ID;
  }
}

export const env = new LoadEnv();
