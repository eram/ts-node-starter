import * as Koa from 'koa';
import joiRouter, {FullHandler, NestedHandler} from 'koa-joi-router';
import {appendRoute} from './healthcheck';

describe('healthcheck middleware tests', () => {

  it('ctx is setup correctly', async () => {

    const router = appendRoute(joiRouter(), '/');
    const handler = router.routes[0].handler as NestedHandler;
    const healthcheckHandler = handler[0] as FullHandler;

    let fnCalled = 0;
    function setFn(field: string, val: string) {
      expect(typeof (field) === 'string' && typeof (val) === 'string').toBeTruthy();
      fnCalled++;
    }

    const ctx: Partial<Koa.Context> = {
      status: 0,
      body: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: setFn as any
    };

    expect(ctx.body).not.toBeTruthy();

    await healthcheckHandler(ctx as Koa.Context, async () => Promise.resolve());

    expect(fnCalled).toEqual(1);
    expect(ctx.status).toEqual(200);
    expect(ctx.body).toBeTruthy();
  });
});
