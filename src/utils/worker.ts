//
// Worker threa module
// this is a small hack to allow running workers under ts-node
// based on https://stackoverflow.com/questions/52955197/how-to-use-webworker-with-ts-node-without-webpack
//
import { Worker as JsWorker } from "worker_threads";
import { merge } from "./copyIn";
import { POJO } from "./pojo";

export class Worker extends JsWorker {
  constructor(file: string, wkOpts: WorkerOptions & { workerData?: POJO }) {
    const opts = merge({ eval: true }, wkOpts);
    opts.workerData = opts.workerData || {};
    opts.workerData._filename_ = file;
    super(`
      const wk = require('worker_threads');
      require('ts-node').register();
      const file = wk.workerData._filename_;
      delete wk.workerData._filename_;
      require(file);
      `, opts);
  }
}
