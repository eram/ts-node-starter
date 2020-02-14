import * as Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { appendRoute } from './openApiDocs';

describe('openApiDocs middleware tests', () => {

  it('ctx is setup correctly', () => {

    const router = appendRoute(joiRouter(), '/');

    expect(router).not.toBeUndefined();
    expect(router.routes).not.toBeUndefined();
    expect(router.routes.length).toEqual(2);
  });

  test('handlers answer', async () => {

    const router = appendRoute(joiRouter(), '/');
    const handler1 = router.routes[0].handler as joiRouter.NestedHandler;
    const apiDoc = handler1[0] as joiRouter.FullHandler;
    const ctx: Partial<Koa.Context> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: () => { return; }
    };

    await apiDoc(ctx as Koa.Context, async () => Promise.resolve());
    expect(typeof ctx.body).toEqual('string');

    const handler2 = router.routes[1].handler as joiRouter.NestedHandler;
    const apiJson = handler2[0] as joiRouter.FullHandler;
    delete ctx.body;
    await apiJson(ctx as Koa.Context, async () => Promise.resolve());
    expect(typeof ctx.body).toEqual('string');
  });
});
