import Koa from "koa";
import { initClient } from "../../libs/cluster";
import { initDb } from "../../models";
import { setupKoa } from "./setupKoa";
import { env, info, sleep } from "../../utils";
import { apm } from "../../utils/apm";


export async function main() {

  const port = Number(process.env.PORT);
  env.print();

  const db = initDb();
  apm.reset();
  const client = initClient();
  const srv = setupKoa(new Koa(), client, db);
  srv.listen(port);

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
