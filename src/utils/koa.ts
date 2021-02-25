/* istanbul ignore file */
import * as koa from "koa";
import { POJO } from "./pojo";

const assert = require("http-assert");


//
// This is meant to work-around some typings BS in koa
//
declare module "koa" {
  export interface Context2 extends koa.Context {   // eslint-disable-line
    body: POJO;
    assert: typeof assert;
  }
}

export default koa;
