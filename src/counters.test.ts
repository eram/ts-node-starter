// tslint:disable-next-line: no-import-side-effect no-implicit-dependencies
import 'jasmine';
import { getCounters } from './counters';

describe('counters tests', () => {

  it('created', () => {
    expect(getCounters()).not.toBeUndefined();
  });
});
