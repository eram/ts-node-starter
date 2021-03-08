import * as path from "path";
import { env, getLogger, LogLevel, sleep, errno, critical, CustomError } from "../../utils";

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
process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");
process.on("uncaughtException", (err: CustomError) => { critical("uncaughtException", err); process.exit(err.errno || errno.EBADF); });
process.on("unhandledRejection", (err: CustomError) => { critical("unhandledRejection", err); process.exit(err.errno || errno.EBADF); });
main().then((rc: number) => {
  if (rc) {
    process.emit("exit", rc);
  }
}).catch(err => {
  throw new Error(err);
});
