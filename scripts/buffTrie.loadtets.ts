//
// The below is a small load test for Blacklist Store
//
import * as os from 'os';
import * as path from 'path';
import { BlacklistWriter } from '../src/controllers/blacklistStore';
import { Trie } from '../src/libs/trie/trie';
import * as KeyTrie from '../src/libs/trie/bufferTrie';
import { assert, error, sleep } from '../src/utils';

export async function loadTest() {

  const getCid = () => Math.floor((Math.random() * 10000)) % 5000;
  const getPid = () => Math.floor((Math.random() * 10000)) % 500;
  const getSub = () => String(Math.floor(Math.random() * 10000) % 2000);
  //const getKey3 = (cid: number, pid: number, sub: string) => `${cid}_${pid}_${sub}`;
  const getKey2 = (cid: number, pid: number) => `${cid}_${pid}`;
  const contractsMax = 30000;
  const subsMax = 100;
  const searchMax = 1000000;
  const fname = path.join(os.tmpdir(), `bl-${Date.now().toString(16)}.tmp`);

  if (1) {
    console.log('=== TrieMapping ===');
    console.time('tm.build');
    const tm = new Trie<string[]>({ ignoreCasing: false });
    for (let i = 0; i < contractsMax; i++) {
      const arr = new Array<string>();
      for (let j = 0; j < subsMax; j++) {
        arr.push(getSub());
      }
      tm.set(getKey2(getCid(), getPid()), arr);
    }

    console.timeEnd('tm.build');
    console.log(`tm size: ${tm.stats.size}`);

    console.time('tm.search');
    for (let k = 0; k < searchMax; k++) {
      tm.get(getKey2(getCid(), getPid()))?.includes(getSub());
    }

    const { stats } = tm;
    console.log(stats);
    console.timeEnd('tm.search');

    console.log('=== KeyTrie ===');

    console.time('kt.dump');
    const size = KeyTrie.requiredSize(tm);
    const buffer = Buffer.allocUnsafe(size);
    KeyTrie.dump(tm, buffer);
    console.timeEnd('kt.dump');

    console.time('kt.search');
    const kt = KeyTrie.mount(buffer);
    for (let k = 0; k < searchMax; k++) {
      kt.has(getKey2(getCid(), getPid()), getSub());
    }
    console.log(kt.stats);
    console.timeEnd('kt.search');
  }


  if (0) {
    console.log('=== BlacklistStorage ===');

    const bl = new BlacklistWriter();
    console.time('bl.build');
    for (let i = 0; i < contractsMax; i++) {
      const arr = new Array<string>();
      for (let j = 0; j < subsMax; j++) {
        arr.push(getSub());
      }
      bl.add(getCid(), getPid(), arr);
    }
    console.log(`bl size: ${bl.stats.size}`);
    console.timeEnd('bl.build');

    console.time('bl.search');
    for (let k = 0; k < searchMax; k++) {
      bl.has(getCid(), getPid(), getSub());
    }

    console.log(bl.stats);
    console.timeEnd('bl.search');

    const contracts = bl.stats.size;
    console.log('saving to', fname);

    console.time('bl.save');
    await bl.save(fname);
    console.timeEnd('bl.save');

    bl.clear();
    console.time('bl.load');
    await bl.load(fname);
    console.timeEnd('bl.load');
    console.log(`loaded ${bl.stats.size} rows`);
    assert(bl.stats.size === contracts);
  }

  await sleep(0);
}

loadTest().then(() => { return; }).catch(error);
