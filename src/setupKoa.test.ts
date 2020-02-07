// tslint:disable-next-line: no-import-side-effect no-implicit-dependencies
import 'jasmine';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { setupKoa } from './setupKoa';

describe('setupKoa tests', () => {

  it('created', () => {

    const srv = setupKoa(new Koa(), joiRouter(), './public/');
    expect(srv).not.toBeUndefined();
  });
});
