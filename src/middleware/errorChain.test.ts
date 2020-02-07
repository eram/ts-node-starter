import createError from 'http-errors';
// tslint:disable-next-line: no-import-side-effect no-implicit-dependencies
import 'jasmine';
import * as Koa from 'koa';
import { getCounters } from '../counters';
import { errorChainHandler, koaOnError } from './errorChain';

describe('errorChain middleware tests', () => {

  it('ctx no error', async () => {

    const ctx: Partial<Koa.Context> = {
      state: {},
      status: 0
    };

    expect(ctx.state.errorChain).toBeUndefined();
    await errorChainHandler(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.state.errorChain).not.toBeUndefined();
  });

  it('ctx with manual error', async () => {

    const errors = getCounters().errors;
    const ctx: Partial<Koa.Context> = {
      state: {},
      status: 0
    };

    await errorChainHandler(ctx as Koa.Context, async () => {
      koaOnError(new Error('test'), ctx as Koa.Context);
      return Promise.resolve();
    });

    expect(getCounters().errors).toEqual(errors + 1);
    expect(typeof ctx.state.errorChain).toEqual('object');
    const arr = ctx.state.errorChain as Array<string>;
    expect(arr.length).toEqual(1);
  });

  it('ctx with exception', async () => {

    const errors = getCounters().errors;
    const ctx: Partial<Koa.Context> = {
      state: {},
      status: 0,
      message: '',
      href: 'http://test'
    };

    await errorChainHandler(ctx as Koa.Context, async () => {
      const err = createError(501, 'test');
      throw err;
    });

    expect(getCounters().errors).toEqual(errors + 1);
    expect(ctx.status).toEqual(501);
    expect(ctx.message).toEqual('test');
    expect(typeof ctx.state.errorChain).toEqual('object');
    const arr = ctx.state.errorChain as Array<string>;
    expect(arr.length).toEqual(1);
    expect(arr[0].length).toBeGreaterThan(100);
  });
});
