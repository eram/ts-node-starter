import * as _fs from "fs";
import { promisify } from "util";

// this is just an override of the 'fs' functions to make them async
export const fs = {
  stats: _fs.Stats,
  constants: _fs.constants,

  stat: promisify(_fs.stat),
  exists: promisify(_fs.exists),
  access: promisify(_fs.access),
  readdir: promisify(_fs.readdir),
  readFile: promisify(_fs.readFile),
  writeFile: promisify(_fs.writeFile),
  appendFile: promisify(_fs.appendFile),
  unlink: promisify(_fs.unlink),
  rename: promisify(_fs.rename),
  open: promisify(_fs.open),
  write: promisify(_fs.write),
  read: promisify(_fs.read),
  close: promisify(_fs.close),
};

export const sleep = async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
