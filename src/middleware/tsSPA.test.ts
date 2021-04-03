import * as path from "path";
import { sleep } from "../utils";
import Koa from "../utils/koa";
import { init } from "./tsSPA";


function getCtx(): Partial<Koa.Context2> {
  return {
    state: {},
    status: 0,
    body: {},
    type: "text",
    set: jest.fn(() => { }),
    path: `/${path.basename(__filename)}`,
    originalUrl: `http://localhost/${path.basename(__filename)}`,
    URL: new URL(`http://localhost/${path.basename(__filename)}`),
  };
}

describe("tsCompile functionality", () => {

  test("compile this file should succeed", async () => {
    const cwd = process.cwd();
    const fn = init(__dirname.substr(cwd.length), "/");
    const ctx = getCtx();

    await fn(ctx as Koa.Context2, () => Promise.resolve());

    expect(ctx.type).toEqual(".js");
    expect(typeof ctx.body).toEqual("string");
    expect(ctx.body.startsWith("var")).toBeTruthy();

    // 2nd time to read from cache
    const ctx2 = getCtx();
    await fn(ctx2 as Koa.Context2, () => Promise.resolve());
    expect(ctx2.type).toEqual(".js");
  });

  test("compile ENOENT ts file should throw", async () => {
    const cwd = process.cwd();
    const fn = init(__dirname.substr(cwd.length), "/");
    const ctx = getCtx();
    ctx.path += ".notfound.ts";

    await expect(fn(ctx as Koa.Context2, () => Promise.resolve())).rejects.toThrow(/no such file/);
  });
});

describe("spa middleware functionality", () => {
  test("request to non-ts file should call next", async () => {
    const cwd = process.cwd();
    const fn = init(__dirname.substr(cwd.length), "/");
    const ctx = getCtx();
    const cb = jest.fn(async () => sleep(0));

    await fn(ctx as Koa.Context2, cb);

    expect(ctx.type).toEqual(".js");
    expect(cb).toHaveBeenCalledTimes(0);

    // 2nd time with none-ts file >> should call next callback
    const ctx2 = getCtx();
    ctx2.path += ".jpg";
    await fn(ctx2 as Koa.Context2, cb);
    expect(ctx2.type).toEqual("text");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("should redirect from internal page to SPA page", async () => {

    const mountpoint = "/";
    const redirected = new URL("file://path/");
    const cwd = process.cwd();
    const fn = init(__dirname.substr(cwd.length), mountpoint);
    const ctx = Object.assign(getCtx(), { redirect: jest.fn((_href: string) => { redirected.href = _href; }) });
    ctx.path += "/nospa";

    await fn(ctx as Koa.Context2, () => Promise.resolve());

    expect(ctx.redirect).toHaveBeenCalledTimes(1);
    expect(redirected.pathname).toEqual(mountpoint);
  });
});
