import createError from 'http-errors';
import joiRouter, { Joi } from 'koa-joi-router';

const meta = {
  swagger: {
    summary: 'throw',
    description: 'throws exception',
    tags: ['healthcheck']
  }
};

const validate = {
  params: {
  },
  output: {
    '500-503': {
      body: Joi.object({
        message: Joi.string().description('error message')
      }).description('error body')
    }
  }
};


export function appendRoute(router: joiRouter.Router, path: string){
  router.route({
    method: ['GET'],
    path,
    handler: () => { throw createError(503, '_throw was called'); },
    validate,
    meta
  });

  return router;
}