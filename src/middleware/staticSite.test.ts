import * as Koa from 'koa';
import {staticSiteBuilder} from './staticSite';

afterAll(() => {
  console.log('staticSite.test done');
});

describe('static-site middleware tests', () => {

  it('middleware is created', () => {

    const fn = staticSiteBuilder('./public', '/');
    expect(typeof fn).toEqual('function');
  });

  it('throws on invalid folder', () => {

    let thrown = false;

    try {
      staticSiteBuilder('./test123', '/');
    } catch (err) {
      thrown = true;
    }

    expect(thrown).toBeTruthy();
  });

  it('middleware responds', async () => {

    const fn = staticSiteBuilder('./public', '/');
    expect(typeof fn).toEqual('function');

    const ctx: Partial<Koa.Context> = {
      method: 'GET',
      path: 'favicon.png'
    };

    let thrown = false;

    try {
      await fn(ctx as Koa.Context, async () => Promise.resolve());
    } catch (err) {
      thrown = true;
    }

    expect(thrown).toBeTruthy();
  });
});
