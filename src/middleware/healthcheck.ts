import * as Koa from 'koa';
import {sleep} from '../utils';

export const i = ['111', 1];

export interface IHhalom {
  str: number;
}

async function _healthcheck() {

  // TODO: check something interesting....
  await sleep(1);

  const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  return {
    ok: (heap < 1000),
    msg: {
      uptime: Math.round(process.uptime()),
      heap: `${heap}MB`
    }
  };
}

export async function healthcheckHandler(ctx: Koa.Context): Promise<void> {

  const {ok, msg} = await _healthcheck();

  ctx.status = 200;
  ctx.set('Cache-Control', 'no-cache');
  ctx.type = 'json';
  ctx.body = {
    ok: (ok ? true : false),
    ...msg
  };
}
