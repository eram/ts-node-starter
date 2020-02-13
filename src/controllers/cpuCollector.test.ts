import {initCpuCollector} from './cpuCollector';
import {CpuEntry} from '../repos';
import {sleep} from '../utils';
import {Repository} from 'sequelize-typescript';


describe('cpuCollector controller tests', () => {

  it('calls repo to create a cpu entry', async () => {

    const repo: Partial<Repository<CpuEntry>> = {

      create: jest.fn(async (values: {cpu: number}, _options: object) => {
        expect(typeof values).toEqual('object');
        expect(values).toHaveProperty('cpu');
        return Promise.resolve({id:1, cpu: values.cpu});
      })
    };

    // run twice: once to start and once to stop
    initCpuCollector(repo as Repository<CpuEntry>, 1);
    initCpuCollector(repo as Repository<CpuEntry>, 0);
    await sleep(10);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
});
