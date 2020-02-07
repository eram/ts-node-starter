import Koa from 'koa';
import { getCounters } from '../counters';
import { appendError } from '../setupKoa';

let maxRespTime = Number(process.env.WARN_RESPONSE_TIME) || 100;

export async function responseTimeHandler(ctx: Koa.Context, next: () => Promise<void>) {

  // measure response time
  const start = Date.now();
  getCounters().requestsInPorgress++;
  getCounters().requests++;

  await next();

  const ms = Date.now() - start;
  if (ms > maxRespTime) {
    appendError(ctx, `Long response time ${ms}ms: ${ctx.href}`);
    ctx.set('X-Response-Time', `${ms}ms`);
  }

  getCounters().requestsInPorgress--;
}

export function setMaxRespTime(time: number) {
  const rc = maxRespTime;
  maxRespTime = time;
  return rc;
}
