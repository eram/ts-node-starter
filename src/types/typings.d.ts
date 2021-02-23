/* eslint-disable @typescript-eslint/naming-convention */

// this is a fix to sequalize typings
import { FindOptions as FO, TableHints, Model } from "sequalize";
declare module "sequelize" {
  export interface FindOptions extends FO {
    tableHints?: TableHints;
  }

  // Model has some useful fields that are not in the typing
  export interface Model2 extends Model {
    id?: number;
    _previousDataValues?: Model;
    associate?: () => void;
  }
}
