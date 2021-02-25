import Koa from "koa";
import { worker } from "cluster";
import { initClient } from "../../libs/cluster";
import { initDb, checkDbAlive } from "../../models";
import { setupKoa } from "./setupKoa";
import { env, errno, info } from "../../utils";
import { apm } from "../../utils/apm";


export async function main() {

  const port = Number(process.env.PORT);
  env.print();

  const db = initDb();
  if (!await checkDbAlive()) return errno.ENOENT;

  apm.reset();
  const client = initClient();
  const srv = setupKoa(new Koa(), client, db);
  srv.listen(port);

  process.on("SIGINT", () => {
    console.log("SIGINT ...");
    client.removeCallback();
    worker?.disconnect();
    srv.removeAllListeners();
    setTimeout(() => { process.exit(0); }, 100);
  });

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
