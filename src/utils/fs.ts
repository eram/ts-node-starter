import * as _fs from 'fs';
import { promisify } from 'util';

// this is just an override of the 'fs' functions to make them async
// eslint-disable-next-line @typescript-eslint/class-name-casing
export class fs {
  static readFile = promisify(_fs.readFile);
  static exists = promisify(_fs.exists);
  static unlink = promisify(_fs.unlink);
  static writeFile = promisify(_fs.writeFile);
  static appendFile = promisify(_fs.appendFile);
  static Stats = _fs.Stats;
}
