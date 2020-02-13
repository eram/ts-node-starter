import {getCounters} from './counters';

describe('counters tests', () => {

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
