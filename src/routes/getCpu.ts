import HttpErrors from 'http-errors';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { CpuHistoryRepo } from '../repos';

const Joi = joiRouter.Joi;
let repo: CpuHistoryRepo;

const meta = {
  swagger: {
    summary: 'Get last CPU samples',
    description: 'Get N latest CPU samples',
    tags: ['healthcheck']
  }
};

const validate = {
  params: {
    num: Joi.number().integer().min(1).max(25).example(3).description('number of samples to get').required()
  },
  output: {
    '200-299': {
      body: Joi.array().items({
        id: Joi.number().integer().description('sample id'),
        cpu: Joi.number().integer().description('CPU time sampled'),
        createdAt: Joi.date().description('sample time'),
      }).options({
        allowUnknown: true
      }).description('CPU samples')
    },
    500: {
      body: Joi.object({
        message: Joi.string().description('error message')
      }).description('error body')
    }
  }
};

async function getCpuHandler(ctx: Koa.Context, _next: () => Promise<void>) {
  try {
    const num = Number(ctx.params['num']);
    if (!num) throw new HttpErrors.BadRequest('missing parameter: number of histories to get');

    const cpus = await repo.findAll({
      order: [
        ['id', 'DESC'],
      ],
      limit: num
    });

    if (!cpus) throw new HttpErrors.InternalServerError();

    ctx.status = 200;
    ctx.set('Cache-Control', 'no-cache');
    ctx.type = 'json';
    ctx.body = cpus;
  } catch (err) {
    throw err;
  }
}


export function appendRoute(router: joiRouter.Router, path: string, _repo: CpuHistoryRepo) {

  repo = _repo;

  router.route({
    method: ['GET'],
    path, // 'getcpu/:num'
    handler: getCpuHandler,
    meta,
    validate
  });

  return router;
}