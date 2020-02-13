import HttpErrors from 'http-errors';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import {CpuHistoryRepo} from '../repos';
import {info} from '../utils';

const Joi = joiRouter.Joi;
let repo: CpuHistoryRepo;

const validate = {
  params: {
    num: Joi.string().max(10)
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
    ctx.set('Content-Type', 'application/json');
  } catch (err) {
    info('getCpuHandler', err);
  }
}


export function appendRoute(router: joiRouter.Router, path: string, _repo: CpuHistoryRepo) {

  repo = _repo;

  router.route({
    method: ['GET'],
    path, // 'getcpu/:num'
    handler: getCpuHandler,
    validate
  });

  return router;
}