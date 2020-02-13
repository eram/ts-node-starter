import * as Koa from 'koa';
import joiRouter from 'koa-joi-router';


async function healthcheck() {

  // TODO: check something interesting....
  await Promise.resolve();

  const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  return {
    ok: (heap < 1000),
    msg: {
      uptime: Math.round(process.uptime()),
      heap: `${heap}MB`
    }
  };
}

async function healthcheckHandler(ctx: Koa.Context, next: Koa.Next) {

  await next();

  const {ok, msg} = await healthcheck();

  ctx.status = 200;
  ctx.set('Cache-Control', 'no-cache');
  ctx.type = 'json';
  ctx.body = {
    ok: (ok ? true : false),
    ...msg
  };
}

export function appendRoute(router: joiRouter.Router, path: string){
  router.route({
    method: ['GET'],
    path,
    handler: healthcheckHandler
  });

  return router;
}