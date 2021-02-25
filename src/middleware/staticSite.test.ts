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

    const ctx: Partial<Koa.Context2> = {
      method: "GET",
      path: "favicon.png",
      set: () => { },
      // @ts-expect-error
      acceptsEncodings: () => ["deflate", "gzip"],
    };

    Object(ctx).response = {
      get: () => "",
    };

    await fn(ctx as Koa.Context2, async () => Promise.resolve());

    expect(ctx.body).toBeInstanceOf(ReadStream);
    expect(ctx.body.readable).toBeTruthy();
    expect(ctx.type).toEqual(".png");
  });
});
