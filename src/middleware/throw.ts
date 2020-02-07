import createError from 'http-errors';
import Koa from 'koa';

export async function throwHandler(ctx: Koa.Context, next: () => Promise<void>) {
  throw createError(503, '_throw was called');
}
