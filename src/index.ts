import { env, errno, fs } from "./utils";
import * as path from "path";
import cluster from "cluster";
import * as Command from "commander";
import { clusterStart } from "./libs/cluster";
const pkg = require('../package.json');  // eslint-disable-line


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
      console.error("error: 'path' must be .env file");
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

/*
cmd
  .command("node", { isDefault: true })
  .alias("n")
  .description("run app in a single node.")
  .action(async (param: string) => {

    await reloadEnv();
    param = param || "src/jobs/app";
    const filename = path.resolve(param);
    const script = require(filename);   // eslint-disable-line
    if (!script) {
      console.error("error: app failed to run");
      process.exit(errno.EBADMSG);
    }
  });
*/

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
      console.error("File not found");
      process.exit(errno.ENOENT);
    }

    const pojo = require(filename);         // eslint-disable-line
    const arr = !!pojo && pojo.apps;

    if (!Array.isArray(arr)) {
      console.error("file is not a pm2 ecosystem file.");
      process.exit(errno.EBADMSG);
    }

    const rc = await clusterStart(arr);
    if (rc) {
      console.error("error:", errno.getStr(rc));
      process.exit(rc);
    }
  });

cmd
  .command("job <folder>")
  .alias("j")
  .description("run a job app in a single node.", {
    folder: "runnable folder",
  })
  .action(async (param: string) => {

    await reloadEnv();
    const filename = path.resolve(param, "index.ts");
    if (!await fs.exists(filename)) {
      console.error("error: 'path' must be folder with index.ts file'");
      process.exit(errno.ENOENT);
    }

    try {
      const script = require(filename);   // eslint-disable-line
      if (!script) {
        console.error("error: job failed to run");
        process.exit(errno.EBADMSG);
      }
    } catch (e) {
      console.error("error in job script");
      throw e;
    }
  });

cmd.parse(process.argv);

