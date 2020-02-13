import createError from 'http-errors';
import * as Koa from 'koa';
import {getCounters} from '../counters';
import {errorChainHandler, koaOnError} from './errorChain';

describe('errorChain middleware tests', () => {

  test('ctx no error', async () => {

    const ctx: Partial<Koa.Context> = {
      state: {},
      status: 0
    };

    expect(ctx.state.errorChain).toBeUndefined();
    await errorChainHandler(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.state.errorChain).not.toBeUndefined();
  });

  test('ctx with manual error', async () => {

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
    expect(typeof ctx.state.errorChain.length).toBeDefined();
    const arr = ctx.state.errorChain as string[];
    expect(arr.length).toEqual(1);
  });

  test('ctx with exception', async () => {

    const errors = getCounters().errors;
    const ctx: Partial<Koa.Context> = {
      state: {},
      status: 0,
      message: '',
      href: 'http://test'
    };

    await errorChainHandler(ctx as Koa.Context, async () => {
      await Promise.resolve(); // stop complaining
      throw createError(503, 'test');
    });

    expect(getCounters().errors).toEqual(errors + 1);
    expect(ctx.status).toEqual(503);
    expect(ctx.message).toEqual('test');
    expect(typeof ctx.state.errorChain).toEqual('object');
    const arr = ctx.state.errorChain as string[];
    expect(arr.length).toEqual(1);
    expect(arr[0].length).toBeGreaterThan(100);
  });
});
