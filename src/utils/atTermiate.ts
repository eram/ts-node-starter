//
// this lib implementes the best practices for handing termination on nodejs
// see https://blog.heroku.com/best-practices-nodejs-errors
// app can register callbacks to be called on process greacefull termination.
// the lib also registers unhandeled-exception handlers on first call to atTerminate()
//

import { CustomError, errno } from "./customError";
import { critical, warn } from "./logger";

type OnTerminate = (sig?: NodeJS.Signals) => void;
type OnTerminateCB = (cb: () => void, sig?: NodeJS.Signals) => void;
let cbs = new Array<{ id: number; close?: OnTerminate; closeCB?: OnTerminateCB }>();
let counter = Date.now() % 1717;

// on exit close gracefully: last-in-first-out
export function makeExitHandler(code: number, sig: NodeJS.Signals) {
  return () => {
    warn(`terminating on ${sig}...`);
    setTimeout(() => { process.exit(code); }, 1000).unref();

    const onCb = () => {
      const icb = cbs.pop();
      if (icb) {
        if (icb.closeCB) {
          icb.closeCB(onCb, sig);
        } else {
          icb.close(sig);
          onCb();
        }
      }
    };

    onCb();
    process.exit(code);
  };
}

// on error we just err-out and terminate
export function makeErrorHandler(reason: string) {
  return (err: CustomError) => {
    critical(reason, err.stack || err);
    process.exit(err.errno || errno.EBADF);
  };
}


function atTerminate_(icb: typeof cbs[0]) {

  if (!cbs.length) {
    process.once("uncaughtException", makeErrorHandler("Unexpected Error"));
    process.once("unhandledRejection", makeErrorHandler("Unhandled Promise"));
    process.once("SIGTERM", makeExitHandler(0, "SIGTERM"));
    process.once("SIGINT", makeExitHandler(0, "SIGINT"));
  }

  cbs.push(icb);
  return icb.id;
}

// gracefull termination function: last-in-first-out. returns a callback id that can later be removed.
export const atTerminate = (cb: OnTerminate) => atTerminate_({ id: ++counter, close: cb });

// gracefull termination function with a callback: last-in-first-out. returns a callback id that can later be removed.
export const atTerminateCB = (cb: OnTerminateCB) => atTerminate_({ id: ++counter, closeCB: cb });

// remove a callback
export const atRemove = (id: number) => {
  const { length } = cbs;
  cbs = cbs.filter(cbi => cbi.id !== id);
  return (length > cbs.length);
};
