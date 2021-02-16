//
// CustomError can be extended to create custom errors that behave like an Error
// and gets printed nicely on JSON.stringify.
// See discussion for details: https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
//
import * as os from "os";
import { merge } from "./copyIn";

export class CustomError extends Error {

  constructor(err?: Error | string) {
    super((typeof err === "string") ? err : err.message);

    try {
      this.name = this.constructor.name;
      if (typeof err !== "string") this.stack = err.stack;
      Object.setPrototypeOf(this, new.target.prototype);            // restore prototype chain TS2.2 style
      Object.defineProperty(this, "message", { enumerable: true }); // make 'message' avail in JSON.stringify
      Object.defineProperty(this, "stack", { enumerable: true });   // make 'stack' avail in JSON.stringify
    } catch (e: unknown) {
      // some error helpers make properties read-only
    }
  }
}

//
// get the error string of the input errno
//
export const errno = merge({
  getStr(_errno: number) {
    for (const key in this) {
      if (this[key] === _errno) return key;
    }
    return _errno.toString();
  },
}, os.constants.errno);

