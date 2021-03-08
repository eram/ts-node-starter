import * as path from "path";
import { initDb } from "../../models";
import { env, getLogger, LogLevel, errno, critical, CustomError } from "../../utils";

async function main() {
  env.reload();
  const jobName = path.basename(__dirname);
  const log = getLogger(jobName, LogLevel.info);

  log.info(`creating ${process.env.DB_DIALECT}:${process.env.DB_Name}`);
  const db = initDb();
  await db.sync({ force: true });

  log.info("job done");
  return 0;
}

// node entry point (TS)
process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");
process.on("uncaughtException", (err: CustomError) => { critical("uncaughtException", err); process.exit(err.errno || errno.EBADF); });
process.on("unhandledRejection", (err: CustomError) => { critical("unhandledRejection", err); process.exit(err.errno || errno.EBADF); });
main().then((rc: number) => {
  process.emit("exit", rc);
}).catch(err => {
  throw new Error(err);
});
