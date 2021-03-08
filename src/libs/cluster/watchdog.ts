/* istanbul ignore file */

import cluster from "cluster";
import { getLogger, LogLevel, errno, critical, CustomError, assert, env } from "../../utils";
import { initClient } from "./client";
import { system } from "../../utils/shell";

process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");
process.on("uncaughtException", (err: CustomError) => { critical("uncaughtException", err); process.exit(err.errno || errno.EBADF); });
process.on("unhandledRejection", (err: CustomError) => { critical("unhandledRejection", err); process.exit(err.errno || errno.EBADF); });
const logger = getLogger("Watchdog", LogLevel.info);
const WD_TIMEOUT_RESTART = Number(process.env.WD_TIMEOUT_RESTART) || 10_000;
const WD_MAX_MEMORY_RESTART = Number(process.env.WD_MAX_MEMORY_RESTART) || 10_000;


function restartMaster(sig = "SIGINT") {

  const argv = [...process.argv];
  argv.shift();
  argv.shift();
  const command = `node ${env.isDebugging ? "--inspect " : ""}${argv.join(" ")}`;
  logger.info("running new master:", command);
  void system(command);

  logger.info(`killing master with ${sig}...`);
  process.kill(process.ppid, sig);

  setTimeout(() => {
    // we should be dead by now... if not, then retry killing master
    logger.error("restarting master SIGKILL...");
    process.kill(process.ppid, "SIGKILL");
  }, WD_TIMEOUT_RESTART / 3).unref();
}


void (async () => {

  assert(cluster.isWorker, "watchdog must run on a worker");

  const client = initClient();
  let lastMem = 0;
  let lastCpu = 0;
  let lastLive = Date.now();

  setInterval(async () => {
    try {
      // ping master
      let restart = false;
      const pkt = await client.send("ping", "master");
      logger.assert(pkt.msg === "pong");
      const now = Date.now();
      if (!pkt.error) {
        lastLive = now;
      }

      // check health
      if (now - lastLive > WD_TIMEOUT_RESTART) {
        logger.error(`master timeout error: ${pkt.error}`);
        restart = true;
      }
      if (Number(pkt.mem) > WD_MAX_MEMORY_RESTART && lastMem > WD_MAX_MEMORY_RESTART) {
        logger.error(`master memory twice over max: ${pkt.mem} MB`);
        restart = true;
      }
      if (Number(pkt.cpu >= 99) && lastCpu >= 99) {
        logger.error(`master CPU twice over max: ${pkt.cpu}%`);
        restart = true;
      }

      lastCpu = Number(pkt.cpu);
      lastMem = Number(pkt.mem);
      if (restart && !env.isDebugging) {
        restartMaster();
      }
    } catch (err) {
      logger.error(err);
    }
  }, WD_TIMEOUT_RESTART);

  logger.info(`running on worker ${cluster.worker.id} pid ${process.pid}`);
  return 0;
})();
