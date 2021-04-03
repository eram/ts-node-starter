import * as path from "path";
import createHttpError from "http-errors";
import { afs, error, info } from "../utils";
import Koa from "../utils/koa";
import { TsCompileOptions, prepare } from "./tsCompile";

export function init(folder: string, mountpoint: string, options: TsCompileOptions = {}) {

  // when code is inside a docker, it requers a re-deployment to change the code.
  // when we debug we want the server to re-compile if the file has changed.
  const reloadSupported = process.env.POD_NAMESPACE === "debug";
  const { cache, transpiler } = prepare(options);

  return async function spa(ctx: Koa.Context, next: Koa.Next) {
    let source: string;
    const { path: pathname, originalUrl } = ctx;

    try {
      const ext = path.extname(pathname);
      if (pathname.startsWith(mountpoint)) {
        if (!ext && ctx.get("redirect") !== "error" && ![mountpoint, `${mountpoint}/`].includes(pathname)) {
          // this is a request to a page that is not the SPA entry page
          info(`redirecting to SPA page: ${originalUrl}`);
          const redirect = ctx.URL;
          redirect.pathname = mountpoint;
          return ctx.redirect(redirect.href);

        } else if ((ext === ".ts" || ext === ".tsx") && (pathname.startsWith(mountpoint))) {
          info(`tsCompile direct ts/tsx: ${originalUrl}`);
          const file = path.join(process.cwd(), folder, pathname.substr(mountpoint.length));
          let cachedValue = await cache.get(file);
          const stats = reloadSupported ? await afs.stat(file) : { mtimeMs: 0 };
          if (!cachedValue || cachedValue.timestamp < stats.mtimeMs) {
            source = await transpiler(file);
            cachedValue = { timestamp: stats.mtimeMs, source };
            cache.set(file, cachedValue);
          } else {
            source = cachedValue.source;
          }
        }
      }

      if (source) {
        ctx.body = source;
        ctx.type = ".js";
        ctx.set("Content-Type", "text/javascript; charset=UTF-8");
      } else {
        await next();
      }
    } catch (e) {
      error(`tsCompile error ${pathname}:`, e);
      throw (e.code === "ENOENT") ? new createHttpError.NotFound(`no such file: ${originalUrl}`) : new Koa.HttpError(e);
    }
  };
}
