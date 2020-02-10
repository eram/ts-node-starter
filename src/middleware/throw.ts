import createError from 'http-errors';
import Koa from 'koa';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function throwHandler(_ctx: Koa.Context, _next: () => Promise<void>) {
  await Promise.resolve(); // must have await...
  throw createError(503, '_throw was called');
}
