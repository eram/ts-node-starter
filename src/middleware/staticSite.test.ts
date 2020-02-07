
import 'jasmine';
import * as Koa from 'koa';
import { staticSiteBuilder } from './staticSite';

describe('static-site middleware tests', () => {

  it('middleware is created', () => {

    const fn = staticSiteBuilder('./public', '/');
    expect(typeof fn).toEqual('function');
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
      await fn(ctx as Koa.Context, () => Promise.resolve());
    } catch (err) {
      thrown = true;
    }

    expect(thrown).toBeTrue();
  });
});
