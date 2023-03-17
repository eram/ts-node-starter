//
// CustomError can be extended to create custom errors that behave like an Error
// and gets printed nicely on JSON.stringify.
// See discussion for details: https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
//
import { constants } from "os";

export class CustomError extends Error {

  constructor(err?: CustomError | string, public readonly errno?: number, public readonly code?: string) {
    super((typeof err === "string") ? err : err.message);

    try {
      this.name = this.constructor.name;
      if (typeof err !== "string") {
        ["stack", "code", "errno"].forEach(key => {
          if (typeof Object(err)[key] !== "undefined") {
            Object(this)[key] = Object(err)[key];
          }
        });
      }

      ["name", "message", "stack", "code", "errno"].forEach(key => {
        if (typeof Object(this)[key] !== "undefined") {
          Object.defineProperty(this, key, { enumerable: true });     // make propery avail in JSON.stringify
        }
      });
      Object.setPrototypeOf(this, new.target.prototype);              // restore prototype chain TS2.2 style
    } catch (e: unknown) {
      // some error helpers make properties read-only
    }
  }
}

//
// strError: function to get the error string of the input errno
//
export const errno = {
  strError(_errno: number) {
    const found = Object.keys(errno).find(key => (Object(errno)[key] === _errno));
    return found || _errno.toString();
  },
  ...constants.errno };
