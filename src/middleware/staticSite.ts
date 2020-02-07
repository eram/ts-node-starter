import * as fs from 'fs';
import Koa from 'koa';
import mount from 'koa-mount';
import serve from 'koa-static';
import { resolve } from 'path';
import { trace } from '../utils';

// note! this must be used directly by koa, not thru a router. for example:
// app.use(staticSiteBuilder('./public/img', '/img'));

export function staticSiteBuilder(folder: string, mountPoint: string) {

  const f = resolve(folder);
  if (!fs.existsSync(f)) {
    throw new Error(`staticSiteBuilder: folder '${folder}' not found.`);
  }

  const srv = serve(f, {defer: false, gzip: false});
  const mnt = mount(mountPoint, srv);

  return async function(ctx: Koa.Context, next: () => Promise<void>) {
    trace(`${ctx.method}: ${ctx.path}`);
    return mnt(ctx, next);
  };
}
