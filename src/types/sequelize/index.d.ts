/* eslint-disable @typescript-eslint/naming-convention */

// this is a fix to sequalize typings
import { FindOptions as FO, TableHints, Model } from "sequalize";

declare namespace sequelize {
  export interface FindOptions extends FO {
    tableHints?: TableHints;
  }

  // Model has some useful fields that are not in the typing
  export type Model2 = Model & {
    id?: number;
    _previousDataValues?: POJO;
    associate?: () => void;
  };
}


