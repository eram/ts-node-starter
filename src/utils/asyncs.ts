import * as _fs from "fs";
import { promisify } from "util";
import * as path from "path";


export class AsyncArray<T> extends Array<T> {
  async asyncForEach(callback: (item: T, index: number) => Promise<void>) {
    for (let index = 0; index < this.length; index++) {
      await callback(this[index], index);     // eslint-disable-line
    }
  }

  async asyncForAll(callback: (item: T, index: number) => Promise<void>) {
    await Promise.all(this.map(callback));
  }
}


// this is just an override of the 'fs' functions to make them async
export const afs = {
  ..._fs.promises,
  ..._fs.constants,
  Stats: _fs.Stats,                     // eslint-disable-line
  Dirent: _fs.Dirent,                   // eslint-disable-line
  exists: promisify(_fs.exists),

  // recursive iterate directory, files first
  dirIterate: (folder: string | _fs.Dirent, cb: (dirent: _fs.Dirent) => void) => {
    // @ts-expect-error
    const dirent = (typeof folder === "string") ? new _fs.Dirent(folder, 2 /* UV_DIRENT_DIR */) : folder;
    const entries = _fs.readdirSync(dirent.name, { withFileTypes: true });
    entries.forEach(entry => {
      entry.name = path.join(dirent.name, entry.name);
      if (entry.isDirectory()) {
        afs.dirIterate(entry, cb);
      } else {
        cb(entry);
      }
    });
    cb(dirent);
  },

  // recursive remove directory
  rmdirRecursive: async (folder: string) => {

    const files: Promise<void>[] = [];
    const dirs = new AsyncArray<_fs.Dirent>();
    if (await afs.exists(folder)) {
      afs.dirIterate(folder, (dirent) => {
        if (dirent.isDirectory()) {
          dirs.push(dirent);
        } else {
          files.push(afs.unlink(dirent.name));
        }
      });
    }
    await Promise.all(files);
    return dirs.asyncForEach(async dir => { await afs.rmdir(dir.name); });
  },

};

export const sleep = async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

