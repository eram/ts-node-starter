import joiRouter from "koa-joi-router";
import Koa from "../utils/koa";
import { init } from "./openApiDocs";

describe("openApiDocs middleware tests", () => {

  test("ctx is setup correctly", () => {

    const joirouter = joiRouter();
    joirouter.prefix("2");
    const router = init(joirouter);

    expect(router).not.toBeUndefined();
    expect(router.routes).not.toBeUndefined();
    expect(router.routes.length).toEqual(2);
  });

  test("handlers answer", async () => {

    const router = init(joiRouter());
    const handler1 = router.routes[0].handler as joiRouter.NestedHandler;
    const apiDoc = handler1[0] as joiRouter.FullHandler;
    const ctx: Partial<Koa.Context> = {
      set: () => { },
    };

    await apiDoc(ctx as Koa.Context, async () => Promise.resolve());
    expect(typeof ctx.body).toEqual("string");
    expect(ctx.status).toEqual(200);

    const handler2 = router.routes[1].handler as joiRouter.NestedHandler;
    const apiJson = handler2[0] as joiRouter.FullHandler;
    delete ctx.body;
    await apiJson(ctx as Koa.Context, async () => Promise.resolve());
    expect(typeof ctx.body).toEqual("string");
    expect(ctx.status).toEqual(200);
  });
});
