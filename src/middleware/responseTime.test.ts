import * as Koa from 'koa';
import {sleep} from '../utils';
import {responseTimeHandler, setMaxRespTime} from './responseTime';
import {getCounters} from '../counters';
// import io from '@pm2/io';
import {io} from '../counters';

afterAll(()=>{
  console.log('responseTime.test done');
});

describe('responseTime middleware tests', () => {

  test('meter is working as expected', async () => {

    const mtr = io.meter({
      name: 'mtr1'
    });

    // Object(mtr).samples = 1; // per second

    mtr.mark();
    await sleep(100);
    mtr.mark();
    expect(mtr.val()).toEqual(2);
  });

  it('counters are updated', async () => {

    const counters = getCounters();
    const requestsInPorgress = counters.requestsInPorgress.val();
    const requestsLatency = counters.requestsLatency.getCount();
    counters.requests.mark();
    const requests = counters.requests.val();

    const ctx: Partial<Koa.Context> = {
      status: 0,
      body: '',
      set: () => { return; }
    };

    await responseTimeHandler(ctx as Koa.Context, async () => {
      expect(counters.requestsInPorgress.val()).toEqual((requestsInPorgress + 1));
      return Promise.resolve();
    });

    expect(counters.requestsInPorgress.val()).toEqual(requestsInPorgress);
    expect(counters.requestsLatency.getCount()).toEqual(requestsLatency + 1);
    expect(counters.requests.val()).toEqual(requests + 1);
  });

  it('ctx headers added on long response', async () => {

    const save = setMaxRespTime(1);

    let fnCalled = 0;
    function setFn(field: string, val: string) {
      expect(typeof (field) === 'string' && typeof (val) === 'string').toBeTruthy();
      expect(field === 'X-Response-Time' && val.indexOf('ms') > 0).toBeTruthy();
      fnCalled++;
    }

    const ctx: Partial<Koa.Context> = {
      status: 0,
      body: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: setFn as any
    };

    expect(ctx.body).not.toBeTruthy();

    await responseTimeHandler(ctx as Koa.Context, async () => {
      await sleep(10);
      return Promise.resolve();
    });

    expect(fnCalled).toEqual(1);
    setMaxRespTime(save);
  });
});
