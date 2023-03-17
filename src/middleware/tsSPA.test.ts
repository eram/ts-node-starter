import { sleep } from "../utils";
import Koa from "../utils/koa";
import { init } from "./tsSPA";

const baseFolder = "src/libs/tsTranspile/__mocks__";
const mountPoint = "/mp";
const files = {
  validImports: "validImports.ts",
  ENOENT: "notFound.ts",
  nonTs: "favicon.ico",
};

function getCtx(fn: string): Partial<Koa.Context2> {
  const url = new URL("http://localhost");
  url.pathname = `${mountPoint}/${fn}`;
  return {
    state: {},
    status: 0,
    body: {},
    type: "text",
    set: jest.fn(() => { }),
    get: jest.fn(() => ""),
    query: {},
    path: url.pathname,
    originalUrl: url.href,
    URL: url,
    throw: jest.fn(() => ({} as never)),
  };
}

describe("spa middleware functionality", () => {

  test("transpile file with imports should succeed", async () => {
    const fn = init(baseFolder, mountPoint);
    const ctx = getCtx(files.validImports);

    await fn(ctx as Koa.Context2, () => Promise.resolve());

    expect(ctx.type).toEqual(".js");
    expect(typeof ctx.body).toEqual("string");
    expect(ctx.body.startsWith("/* istanbul ")).toBeTruthy();
  });

  test("transpile ENOENT ts file should call next", async () => {
    const fn = init(baseFolder, mountPoint);
    const ctx = getCtx(files.ENOENT);

    const next = jest.fn(() => Promise.resolve());
    await fn(ctx as Koa.Context2, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("request to non-ts file should call next", async () => {
    const fn = init(baseFolder, mountPoint);
    const ctx = getCtx(files.nonTs);
    const cb = jest.fn(async () => sleep(0));
    expect(cb).toHaveBeenCalledTimes(0);
    await fn(ctx as Koa.Context2, cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("should redirect from internal page to SPA page", async () => {
    const redirected = new URL("file://");
    const fn = init(baseFolder, mountPoint);
    const ctx = Object.assign(getCtx("inspa/inspa"), {
      redirect: jest.fn((_href: string) => {
        redirected.href = _href;
      }),
    });

    await fn(ctx as Koa.Context2, () => Promise.resolve());

    expect(ctx.redirect).toHaveBeenCalledTimes(1);
    expect(redirected.pathname).toEqual(mountPoint);
  });
});
