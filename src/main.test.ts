
import 'jasmine';
import { sleep } from './utils';

beforeEach(async () => {
  await sleep(0);
});

it('jasmine is working ok', async () => {
  await sleep(0);
  expect(1).toEqual(1);
});
