/* istanbul ignore file */
// testing cluster functionality is out of scope for this project.

import cluster from "cluster";
import { createLogger, LogLevel, assert, env, atTerminate } from "../../utils";
import { initClient } from "./client";
import { system } from "../../utils/shell";

process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");
const log = createLogger("Watchdog", LogLevel.info);
const WD_TIMEOUT_RESTART = Number(process.env.WD_TIMEOUT_RESTART) || 10_000;
const WD_MAX_MEMORY_RESTART = Number(process.env.WD_MAX_MEMORY_RESTART) || 10_000;


function restartMaster(sig = "SIGTERM") {

  if (process.env.WD_RESTART_CLUSTER) {
    const argv = process.argv.slice(2);
    const command = `node ${env.isDebugging ? "--inspect " : ""}${argv.join(" ")}`;
    log.info("running new master:", command);
    void system(command);
  }

  log.info(`killing master with ${sig}...`);
  process.kill(process.ppid, sig);

  setTimeout(() => {
    // we should be dead by now... if not, then retry killing master
    log.error("killing master SIGKILL...");
    process.kill(process.ppid, "SIGKILL");
  }, WD_TIMEOUT_RESTART / 3).unref();
}


(() => {

  assert(cluster.isWorker, "watchdog must run on a worker");
  atTerminate(() => { log.info("terminated"); });

  const client = initClient();
  let lastMem = 0;
  let lastCpu = 0;
  let lastLive = Date.now();

  setInterval(async () => {
    try {
      // ping master
      let restart = false;
      const pkt = await client.send("ping", "master");
      log.assert(pkt.msg === "pong");
      const now = Date.now();
      if (!pkt.error) {
        lastLive = now;
      }

      // check health
      if (now - lastLive > WD_TIMEOUT_RESTART) {
        log.error(`master timeout error: ${pkt.error}`);
        restart = true;
      }
      if (Number(pkt.mem) > WD_MAX_MEMORY_RESTART && lastMem > WD_MAX_MEMORY_RESTART) {
        log.error(`master memory twice over max: ${pkt.mem} MB`);
        restart = true;
      }
      if (Number(pkt.cpu >= 99) && lastCpu >= 99) {
        log.error(`master CPU twice over max: ${pkt.cpu}%`);
        restart = true;
      }

      lastCpu = Number(pkt.cpu);
      lastMem = Number(pkt.mem);
      if (restart && !env.isDebugging) {
        restartMaster();
      }
    } catch (err) {
      log.error(err);
    }
  }, WD_TIMEOUT_RESTART).unref();

  log.info(`running on worker ${cluster.worker.id} pid ${process.pid}`);
  return 0;
})();
