import * as path from "path";
import { initDb } from "../../models";
import { env, getLogger, LogLevel, atTerminate } from "../../utils";

async function main() {

  process.stdin.setEncoding("utf8");
  process.stdout.setEncoding("utf8");

  env.reload();
  const jobName = path.basename(__dirname);
  const log = getLogger(jobName, LogLevel.info);

  atTerminate(() => { log.info("job terminated"); });

  log.info(`creating ${process.env.DB_DIALECT}:${process.env.DB_Name}`);
  const db = initDb();
  await db.sync({ force: true });
  atTerminate(db.close);

  log.info("job done");
  return 0;
}

// node entry point (TS)
main().then((rc: number) => {
  process.emit("exit", rc);
}).catch(err => {
  throw new Error(err);
});
