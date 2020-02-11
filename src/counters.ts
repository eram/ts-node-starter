import {ProcCounters} from './utils';

/**** start hack ****/
// import io from '@pm2/io';

class Counter {
  private _val = 0;
  val = () => this._val;
  inc = () => this._val++;
  dec = () => this._val--;
}

class Meter {
  private _val = 0;
  val = () => this._val;
  mark = (n = 1) => this._val+=n;
}

class Histogram {
  private _val = 0;
  getCount = () => this._val;
  update = (_n: number) => this._val++;
}

export const io = {
  counter: ({}) => { return new Counter(); },
  meter:  ({}) => { return new Meter; },
  histogram:  ({}) => { return new Histogram; }
};

/**** end hack ****/

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

