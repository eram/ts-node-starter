import * as Koa from 'koa';
import {throwHandler} from './throw';


afterAll(()=>{
  console.log('throw.test done');
});

describe('throw middleware tests', () => {

  it('it throws', async () => {

    const ctx: Partial<Koa.Context> = {
    };

    let thrown = false;

    try {
      await throwHandler(ctx as Koa.Context, async () => Promise.resolve());
    } catch (err) {
      thrown = true;
    }

    expect(thrown).toBeTruthy();
  });
});
