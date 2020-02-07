import 'jasmine';
import { getCounters } from './counters';

describe('counters tests', () => {

  it('created', () => {
    expect(getCounters()).not.toBeUndefined();
  });
});
