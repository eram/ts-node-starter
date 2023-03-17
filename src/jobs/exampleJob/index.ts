import * as path from "path";
import { env, createLogger, LogLevel, sleep, atTerminate } from "../../utils";

async function main() {

  process.stdin.setEncoding("utf8");
  process.stdout.setEncoding("utf8");

  const jobName = path.basename(__dirname);
  const log = createLogger(jobName, LogLevel.info);
  atTerminate(() => { log.info("job terminated"); });

  env.print(log);

  // ----
  // do something incredibly important!!
  await sleep(10);
  // ----

  log.info("job done");
  return 0;
}

// node entry point (TS)
main().then((rc: number) => {
  if (rc) {
    process.emit("exit", rc);
  }
}).catch(err => {
  throw new Error(err);
});
