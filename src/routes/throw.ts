import createError from 'http-errors';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';

async function throwHandler(_ctx: Koa.Context, _next: () => Promise<void>) {
  await Promise.resolve(); // must have await...
  throw createError(503, '_throw was called');
}


export function appendRoute(router: joiRouter.Router, path: string){
  router.route({
    method: ['GET'],
    path,
    handler: throwHandler
  });

  return router;
}