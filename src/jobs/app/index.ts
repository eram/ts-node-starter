import Koa from "koa";
import { worker } from "cluster";
import { initClient } from "../../libs/cluster";
import { initDb, checkDbAlive } from "../../models";
import { setupKoa } from "./setupKoa";
import { env, errno, info, sleep, apm } from "../../utils";
import { atTerminate, atTerminateCB } from "../../utils/atTermiate";


async function main() {

  process.stdin.setEncoding("utf8");
  process.stdout.setEncoding("utf8");

  const port = Number(process.env.PORT);
  env.print();
  apm.reset();

  const db = initDb();
  if (!await checkDbAlive()) return errno.ENOENT;
  atTerminate(db.close);

  const client = initClient();
  atTerminate(client.removeCallback.bind(client));

  const app = setupKoa(new Koa(), client, db);
  atTerminate(app.removeAllListeners.bind(app));

  const srv = app.listen(port);
  atTerminateCB(srv.close.bind(srv));

  if (worker) atTerminate(worker.disconnect.bind(worker));

  await sleep(100);
  info("server listerning on", process.env.PUBLIC_URL || `http://localhost:${port}`);
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
