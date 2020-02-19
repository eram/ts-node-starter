// eslint-disable-next-line @typescript-eslint/no-require-imports
import io = require('@pm2/io');

import { getCounters } from './counters';
import { sleep } from './utils';
import { Metric } from '@pm2/io/build/main/services/metrics';

describe('counters tests', () => {

  test('meter is working as expected', async () => {

    io.init();
    const mtr = io.meter({
      name: 'mtr1',
      tickInterval: 1  // measure every 1 msec
    } as Metric);

    mtr.mark();
    await sleep(10);
    mtr.mark();
    expect(mtr.val()).toBeGreaterThan(0.01);
  });


  it('created', () => {
    const counters = getCounters();
    expect(counters).not.toBeUndefined();
    expect(counters.requests).not.toBeUndefined();

    counters.requests.mark();
    expect(typeof counters.requests.val()).toEqual('number');

    counters.requestsInPorgress.inc();
    expect(typeof counters.requestsInPorgress.val()).toEqual('number');

    counters.requestsLatency.update(100);
    expect(typeof counters.requestsLatency.getCount()).toEqual('number');
  });
});
