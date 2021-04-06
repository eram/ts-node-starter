import * as path from "path";
import HttpErrors from "http-errors";
import { info } from "../utils";
import Koa from "../utils/koa";
import { TsTranspileOptions, init as transpileInit, importContextQueryParam, transpile } from "../libs/tsTranspile";

export function init(baseFolder: string, mountPoint: string, tsOptions?: TsTranspileOptions) {

  tsOptions ||= {
    dirs: {
      baseFolder,
      mountPoint,
      cwd: process.cwd(),
    },
  };
  const config = transpileInit(tsOptions);

  const importsHandler = async (ctx: Koa.Context, next: Koa.Next) => {
    const { path: pathname, originalUrl } = ctx;
    const importContextQuery = ctx.query[importContextQueryParam] || "";
    let source: string;

    if (importContextQuery || pathname.startsWith(mountPoint)) {

      const ext = path.extname(pathname);

      // if this is a request to a page that is not the SPA entry page >> rediret to SPA
      if (!ext && ctx.get("redirect") !== "error" && ![mountPoint, `${mountPoint}/`].includes(pathname)) {
        info(`redirecting to SPA page: ${originalUrl}`);
        const redirect = ctx.URL;
        redirect.pathname = mountPoint;
        ctx.redirect(redirect.href);
        return;
      }

      // transpile typescript or call next if the file is not found
      try {
        source = await transpile(ctx.URL, config);
      } catch (e) {
        if (e.code !== "ENOENT" && !e.message.includes("ENOENT")) throw new HttpErrors.InternalServerError(e);
      }
    }

    if (source) {
      ctx.body = source;
      ctx.type = ".js";
      ctx.set("Content-Type", "application/javascript; charset=UTF-8");
    } else {
      await next();
    }
  };

  return importsHandler;
}
