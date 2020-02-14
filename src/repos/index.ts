import { Options } from 'sequelize/types';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { info, debug } from '../utils';

import { CpuHistoryRepo, CpuEntry } from './cpuEntry.model';
export { CpuHistoryRepo, CpuEntry } from './cpuEntry.model';

/* Options: {
  dialect: 'sqlite',
  database: 'cpu',
  storage: ':memory:',
}*/

export function initDb(opts: Options, createDb = false){

  const o: SequelizeOptions = opts;
  o.models = [CpuEntry];
  o.repositoryMode = true;
  o.logging = debug;

  const db = new Sequelize(o);
  info(`sequalize initialized. dialect: ${o.dialect} models: ${o.models.length}`);

  if (createDb){
    db.sync();
  }

  const cpuHisotryRepo: CpuHistoryRepo = db.getRepository(CpuEntry);
  return { db, cpuHisotryRepo };
}

/* TODO: MINI REPOSITORY >> PROXY
function addInferAliasOverrides(): void {
  Object
  .keys(INFER_ALIAS_MAP)
        args[optionIndex] = inferAlias(args[optionIndex], this);
        return superFn.call(this, ...args);
      };
    });
}
*/