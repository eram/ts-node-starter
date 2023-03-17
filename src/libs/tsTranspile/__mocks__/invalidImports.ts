/* istanbul ignore file */
/* eslint-disable */

// import from node itself is invalid for client-side compilation
import * as path from "path";
// import from this project
import { info } from "../../../utils";

export const rc: string = path.join("hi", "there");
info(rc);
