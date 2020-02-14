import { error, info } from '../utils';
import { CpuHistoryRepo, CpuEntry } from '../repos';

let lastCpu = process.cpuUsage().user;
let lastTimeout = 0;

export function initCpuCollector(repo: CpuHistoryRepo, timeout = 10000) {

  lastTimeout = timeout;

  if (lastTimeout > 0) {
    setTimeout((repo) => {
      const thisCpu = process.cpuUsage().user;

      repo.create({ cpu: thisCpu - lastCpu }).then((entry: CpuEntry) => {
        info('created CpuEntry:', `id: ${entry.id} cpu: ${entry.cpu}`);
      }).catch((err: Error) => {
        error(err);
      });

      lastCpu = thisCpu;
      initCpuCollector(repo, lastTimeout);
    }, lastTimeout, repo);
  }
}
