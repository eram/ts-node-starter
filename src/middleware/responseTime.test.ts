// tslint:disable-next-line: no-import-side-effect no-implicit-dependencies
import 'jasmine';
import * as Koa from 'koa';
import { sleep } from '../utils';
import { responseTimeHandler, setMaxRespTime } from './responseTime';

describe('responseTime middleware tests', () => {

  it('ctx headers added on long response', async () => {

    const save = setMaxRespTime(1);

    let fnCalled = 0;
    function setFn(field: string, val: string) {
      expect(typeof (field) === 'string' && typeof (val) === 'string').toBeTrue();
      expect(field === 'X-Response-Time' && val.indexOf('ms') > 0).toBeTrue();
      fnCalled++;
    }

    const ctx: Partial<Koa.Context> = {
      status: 0,
      body: '',
      // tslint:disable-next-line: no-any
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
