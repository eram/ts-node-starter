import * as _fs from 'fs';
import { promisify } from 'util';

// this is just an override of the 'fs' functions to make them async
// tslint:disable-next-line: class-name
export class fs {
    static readFile = promisify(_fs.readFile);
    static exists = promisify(_fs.exists);
    static unlink = promisify(_fs.unlink);
    static writeFile = promisify(_fs.writeFile);
    static appendFile = promisify(_fs.appendFile);
    static Stats = _fs.Stats;
}
