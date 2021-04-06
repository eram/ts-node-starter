/* istanbul ignore file */
/* eslint-disable */

// import from node-modules
import * as jsonwebtoken from "jsonwebtoken";
// import from this project
import { info } from "../../../utils";

export const token: string = jsonwebtoken.sign("hi", "secret");
info(token);
