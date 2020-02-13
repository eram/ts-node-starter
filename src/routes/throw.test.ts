import * as Koa from 'koa';
import joiRouter, {FullHandler, NestedHandler} from 'koa-joi-router';
import {appendRoute} from './throw';


describe('throw middleware tests', () => {

  it('it throws', async () => {

    const router = appendRoute(joiRouter(), '/');
    const handler = router.routes[0].handler as NestedHandler;
    const throwHandler = handler[0] as FullHandler;

    const ctx: Partial<Koa.Context> = {
    };

    let thrown = false;

    try {
      await throwHandler(ctx as Koa.Context, async () => Promise.resolve());
    } catch (err) {
      thrown = true;
    }

    expect(thrown).toBeTruthy();
  });
});
