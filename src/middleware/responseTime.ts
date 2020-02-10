import Koa from 'koa';
import {getCounters} from '../counters';
import {appendError} from '../setupKoa';

let maxRespTime = Number(process.env.WARN_RESPONSE_TIME) || 100;

// update requests counters and alert on long response time
export async function responseTimeHandler(ctx: Koa.Context, next: () => Promise<void>) {

  const start = Date.now();
  const counters = getCounters();

  counters.requestsInPorgress.inc();
  counters.requests.mark();

  await next();

  const ms = Date.now()-start;
  if (ms > maxRespTime) {
    appendError(ctx, `Long response time ${ms}ms: ${ctx.href}`);
    ctx.set('X-Response-Time', `${ms}ms`);
  }

  counters.requestsLatency.update(ms);
  counters.requestsInPorgress.dec();
}

export function setMaxRespTime(time: number) {
  const rc = maxRespTime;
  maxRespTime = time;
  return rc;
}
