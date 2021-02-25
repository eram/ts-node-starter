import joiRouter from "koa-joi-router";
import Koa from "../utils/koa";
import { initClient } from "../libs/cluster";
import { initDb, Options, Sequelize } from "../models";
import { init } from "./healthcheck";

describe("healthcheck middleware", () => {

  let db: Sequelize;

  beforeAll(() => {
    const opts: Options = {
      dialect: "sqlite",
      storage: ":memory:",
    };

    db = initDb(opts);
  });

  test("positive", async () => {

    const client = initClient();
    const router = joiRouter();

    init(router, db, client);

    const handlers = router.routes[0].handler as joiRouter.NestedHandler;
    const handler = handlers[0] as joiRouter.FullHandler;
    expect(handler instanceof Function).toBeTruthy();

    const setFn = jest.fn((field: string, val: string[] | string) => {
      expect(typeof (field) === "string" && typeof (val) === "string").toBeTruthy();
    });

    const ctx: Partial<Koa.Context2> = {
      state: { user: "test user" },
      status: 0,
      body: {},
      set: setFn as never, // 'set' is not assignable in d.ts. hack it.
    };

    await handler(ctx as Koa.Context2, async () => Promise.resolve());

    expect(setFn).toHaveBeenCalledTimes(1);
    expect(ctx.status).toEqual(200);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.ok).toEqual(true);
    expect(typeof ctx.body.apm).toEqual("undefined");
  });

  test("positive apm", async () => {

    const client = initClient();
    const router = joiRouter();

    init(router, db, client);

    const handlers = router.routes[0].handler as joiRouter.NestedHandler;
    const handler = handlers[0] as joiRouter.FullHandler;
    expect(handler instanceof Function).toBeTruthy();

    const setFn = jest.fn((field: string, val: string[] | string) => {
      expect(typeof (field) === "string" && typeof (val) === "string").toBeTruthy();
    });

    const ctx: Partial<Koa.Context2> = {
      status: 0,
      query: { apm: "true" },
      set: setFn as never, // 'set' is not assignable in d.ts. hack it.
    };

    await handler(ctx as Koa.Context2, async () => Promise.resolve());

    expect(setFn).toHaveBeenCalledTimes(1);
    expect(ctx.status).toEqual(200);
    expect(typeof ctx.body?.apm).toEqual("object");
  });

  test("negative: simulate bridge failure", async () => {

    const client = initClient();
    // fail the bridge ping-pong
    jest.spyOn(client, "send").mockReturnValue(Promise.resolve({ error: "test", msg: "pong" }));
    const router = joiRouter();

    init(router, db, client);

    const handlers = router.routes[0].handler as joiRouter.NestedHandler;
    const handler = handlers[0] as joiRouter.FullHandler;
    expect(handler instanceof Function).toBeTruthy();

    const setFn = jest.fn((field: string, val: string[] | string) => {
      expect(typeof (field) === "string" && typeof (val) === "string").toBeTruthy();
    });

    const ctx: Partial<Koa.Context2> = {
      status: 0,
      body: {},
      set: setFn as never, // 'set' is not assignable in d.ts. hack it.
    };

    await handler(ctx as Koa.Context2, async () => Promise.resolve());

    expect(ctx.status).toEqual(200);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.ok).toEqual(false);
  });
});
