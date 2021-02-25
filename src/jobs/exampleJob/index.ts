import * as path from "path";
import { env, getLogger, LogLevel, sleep } from "../../utils";

async function main() {
  const jobName = path.basename(__dirname);
  const log = getLogger(jobName, LogLevel.info);
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
