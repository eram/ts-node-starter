import io from '@pm2/io';
import {ProcCounters} from './utils';

class Counters extends ProcCounters {

  readonly production = (process.env.NODE_ENV === 'production');

  requestsInPorgress = io.counter({
    name: 'inp-reqs'
  });

  requests = io.meter({
    name: 'reqs',
  });

  requestsLatency = io.histogram({
    name: 'latency',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    measurement: 'mean' as any  // pm2/io is not exportng all PMX types...
  });
}

const counters = new Counters();

export function getCounters() {
  return counters;
}

