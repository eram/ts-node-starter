import * as path from "path";
import { initDb } from "../../models";
import { env, getLogger, LogLevel } from "../../utils";

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
main().then((rc: number) => {
  process.emit("exit", rc);
}).catch(err => {
  throw new Error(err);
});
