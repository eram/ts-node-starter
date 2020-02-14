import * as Koa from 'koa';
import joiRouter, { Joi } from 'koa-joi-router';

const meta = {
  swagger: {
    summary: 'Health check',
    description: 'Get application health check status',
    tags: ['healthcheck']
  }
};

const validate = {
  params: {
  },
  output: {
    '200-299': {
      body: Joi.object({
        ok: Joi.boolean().description('status'),
      }).options({
        allowUnknown: true
      }).description('status object')
    },
    500: {
      body: Joi.object({
        message: Joi.string().description('error message')
      }).description('error body')
    }
  }
};


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

  const { ok, msg } = await healthcheck();

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
    handler: healthcheckHandler,
    validate,
    meta
  });

  return router;
}