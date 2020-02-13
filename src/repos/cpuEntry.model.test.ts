import {Options} from 'sequelize/types';
import {initDb} from '.';

describe('cpuEntry model tests', () => {

  it('just cover', () => {

    const opts: Options = {
      dialect: 'sqlite',
      database: 'cpu',
      storage: ':memory:',
    };

    const db = initDb(opts, true);
    expect(typeof db).toEqual('object');
    expect(typeof db.cpuHisotryRepo).toEqual('function');
  });
});
