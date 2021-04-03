import { ReadStream } from "fs";
import Koa from "../utils/koa";
import { init } from "./staticSite";

describe("static-site middleware", () => {

  test("middleware is created", () => {
    const fn = init("./public", "/");
    expect(typeof fn).toEqual("function");
  });

  test("throws on invalid folder", () => {
    expect(() => {
      init("./test123", "/");
    }).toThrow();
  });

  test("middleware responds", async () => {

    const fn = init("./public", "/");
    expect(typeof fn).toEqual("function");

    const getCtx = (path: string): Partial<Koa.Context2> => {
      const ctx: Partial<Koa.Context2> = {
        method: "GET",
        path,
        body: undefined,
        set: () => { },
        // @ts-expect-error
        acceptsEncodings: (() => ["deflate", "gzip"]),
      };

      Object(ctx).response = {
        get: () => "",
      };
      return ctx;
    };

    const ctx1 = getCtx("favicon.ico");
    const cb1 = jest.fn(async () => Promise.resolve());
    await fn(ctx1 as Koa.Context2, cb1);

    expect(ctx1.body).toBeInstanceOf(ReadStream);
    expect(ctx1.body.readable).toBeTruthy();
    expect(ctx1.type).toEqual(".ico");
    expect(cb1).toHaveBeenCalledTimes(0);

    const ctx2 = getCtx("doesnt.exist.png");
    await fn(ctx2 as Koa.Context2, cb1);
    expect(ctx2.body).toBeUndefined();
    expect(cb1).toHaveBeenCalledTimes(1);

  });
});
