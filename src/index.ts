import * as path from "path";
import cluster from "cluster";
import * as Command from "commander";
import { env, errno, error, fs } from "./utils";
import { clusterStart } from "./libs/cluster";

const pkg = require("../package.json");

// run commandline options only from main thread
if (cluster.isWorker) {
  process.exit(0);
}

const cmd = new Command.Command(pkg.name);

async function reloadEnv() {
  const opts = cmd.opts();
  if (opts.env) {
    let param = opts.env;
    if (!param.startsWith(".")) param = `.env.${param}`;
    const filename = path.resolve(param);

    if (!await fs.exists(filename)) {
      error("error: 'path' must be .env file");
      process.exit(errno.EINVAL);
    }
    process.env.DOT_ENV_FILE = filename;
    env.reload();
  }
}

cmd
  .storeOptionsAsProperties(false)
  .passCommandToAction(false)
  .allowUnknownOption(true)
  .helpOption("-h, --help", "display help for command")
  .version(pkg.version, "-v, --version", "output the version number")
  .option("-e, --env <path>", "path to .env file")
  .option("–json, --json", "debug logs in JSON format", () => {
    process.env.LOG_FORMAT = "json";
  });

cmd
  .command("info")
  .alias("i")
  .description("get app environment information.")
  .action(() => { env.print(); });

cmd
  .command("cluster <path>")
  .alias("c")
  .description("run app in cluster mode.", {
    path: "path to cluster config js file",
  })
  .action(async (param: string) => {

    await reloadEnv();

    /*
     * param is the file name of a pm2 ecosystem file: pm2.config.js
     * see https://pm2.keymetrics.io/docs/usage/application-declaration/
     */

    const filename = path.resolve(param);
    if (!await fs.exists(filename)) {
      error("File not found");
      process.exit(errno.ENOENT);
    }

    const pojo = require(filename);         // eslint-disable-line
    const arr = !!pojo && pojo.apps;

    if (!Array.isArray(arr)) {
      error("file is not a pm2 ecosystem file.");
      process.exit(errno.EBADMSG);
    }

    const rc = await clusterStart(arr);
    if (rc) {
      error("error:", errno.getStr(rc));
      process.exit(rc);
    }
  });

cmd
  .command("job <folder>", { isDefault: true })
  .alias("j")
  .description("run a job app in a single node.", {
    folder: "runnable folder",
  })
  .action(async (param: string) => {

    await reloadEnv();
    const filename = path.resolve(param, "index.ts");
    if (!await fs.exists(filename)) {
      error("error: 'path' must be folder with index.ts file'");
      process.exit(errno.ENOENT);
    }

    try {
      const script = require(filename);     // eslint-disable-line
      if (!script) {
        error("error: job failed to run");
        process.exit(errno.EBADMSG);
      }
    } catch (e) {
      error("error in job script");
      throw e;
    }
  });

cmd.parse(process.argv);
