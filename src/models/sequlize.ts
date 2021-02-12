import { Dialect, Sequelize, Options } from "sequelize";
import { assert } from "../utils";
import * as User from "./user.model";
export { Sequelize, Options } from "sequelize";

let sequelize: Sequelize;

export function initDb(opts: Options = {}) {

  if (!sequelize) {

    const { DB_NAME, DB_USER, DB_PWD, DB_DIALECT, DB_HOST, DB_PORT, DB_STORAGE = "", DB_VERBOSE = "false" } = process.env;

    const o = Object.assign({
      database: DB_NAME,
      username: DB_USER,
      password: DB_PWD,
      dialect: DB_DIALECT as Dialect,
      storage: DB_STORAGE,
      host: DB_HOST,
      port: Number(DB_PORT) || 3306,
      logging: (process.argv.includes("--logging") || (!!DB_VERBOSE && DB_VERBOSE !== "false")) ? console.info : false,
      dialectOptions: {
        multipleStatements: true,
      },
      pool: {
        min: 2,
      },
    } as Options, opts);

    assert(!!o.dialect, "Missing Sequelize config");

    sequelize = new Sequelize(o);

    // intiinalize all models
    User.init(sequelize);
    // ***

    // associate models async
    setImmediate(() => {
      Object.keys(sequelize.models).forEach(key => {
        const model = sequelize.models[key];
        const associate = Object(model).associate;
        if (typeof associate === "function") {
          associate();
        }
      });
    });
  }

  return sequelize;
}
