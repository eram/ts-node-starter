import 'jasmine';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import {setupKoa} from './setupKoa';
import {getCounters} from './counters';

afterAll(() => {
  console.log('setupKoa.test done');
});

describe('setupKoa tests', () => {

  it('created', () => {

    // hack!
    Object(getCounters()).production = true;

    const srv = setupKoa(new Koa(), joiRouter(), './public/');
    expect(srv).not.toBeUndefined();
  });
});
