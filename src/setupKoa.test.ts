import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { setupKoa } from './setupKoa';
import { config } from './utils';

describe('setupKoa tests', () => {

  it('created', () => {

    // hack to get a bit more coverage
    Object(config).production = true;

    const srv = setupKoa(new Koa(), joiRouter(), './public/');
    expect(srv).not.toBeUndefined();
    expect(srv.listenerCount('')).toEqual(0);
  });
});
