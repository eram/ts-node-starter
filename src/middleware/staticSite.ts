import * as fs from "fs";
import Koa from "koa";
import mount from "koa-mount";
import serve from "koa-static";
import { resolve } from "path";

// note! this must be used directly by koa, not thru a router. for example:
// app.use(init('./public/img', '/img'));

export function init(folder: string, mountPoint: string) {

  const fn = resolve(folder);
  if (!fs.existsSync(fn)) {
    throw new Error(`staticSiteBuilder: folder '${folder}' not found.`);
  }

  const srv = serve(fn, { defer: false, gzip: true });
  const mnt = mount(mountPoint, srv);

  return async function (ctx: Koa.Context, next: () => Promise<void>){
    await mnt(ctx, next);
  };
}
