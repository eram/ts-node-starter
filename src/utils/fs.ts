import * as _fs from 'fs';
import {promisify} from 'util';

// this is just an override of the 'fs' functions to make them async
export const fs = {
  readFile: promisify(_fs.readFile),
  exists: promisify(_fs.exists),
  unlink: promisify(_fs.unlink),
  writeFile: promisify(_fs.writeFile),
  appendFile: promisify(_fs.appendFile),
  Stats: _fs.Stats
};
