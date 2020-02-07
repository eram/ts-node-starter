import { ProcCounters } from './utils';

class Counters extends ProcCounters {
  // PMX COUNTERS
  production = (process.env.NODE_ENV === 'production');
}

const counters = new Counters();

export function getCounters() {
  return counters;
}
