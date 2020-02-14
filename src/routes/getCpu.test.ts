import * as Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { appendRoute } from './getCpu';
import { CpuEntry } from '../repos';
import { Repository } from 'sequelize-typescript';

describe('getCpu api tests', () => {

  it('ctx is setup correctly', async () => {

    const repo: Partial<Repository<CpuEntry>> = {

      findAll: jest.fn(async (obj: object) => {
        expect(typeof obj).toEqual('object');
        return Promise.resolve({ id: 1, cpu: 1000 });
      })
    };

    const router = appendRoute(joiRouter(), '/', repo as Repository<CpuEntry>);
    const handler = router.routes[0].handler as joiRouter.NestedHandler;
    const getCpuHandler = handler[0] as joiRouter.FullHandler;

    expect(typeof getCpuHandler).toEqual('function');

    const ctx: Partial<Koa.Context> = {
      params: { 'num': '1' },
      set: () => { return; }
    };

    await getCpuHandler(ctx as Koa.Context, async () => Promise.resolve());

    expect(repo.findAll).toBeCalledTimes(1);
    expect(ctx.status).toEqual(200);
    expect(ctx.body).toBeTruthy();
  });

  it('handler throws on err', async () => {

    const router = appendRoute(joiRouter(), '/', {} as Repository<CpuEntry>);
    const handler = router.routes[0].handler as joiRouter.NestedHandler;
    const getCpuHandler = handler[0] as joiRouter.FullHandler;

    expect(typeof getCpuHandler).toEqual('function');

    const ctx: Partial<Koa.Context> = {
      params: {},
      set: () => { return; }
    };

    try {
      await getCpuHandler(ctx as Koa.Context, async () => Promise.resolve());
    } catch (err) {
      expect('should throw');
    }
  });

});
