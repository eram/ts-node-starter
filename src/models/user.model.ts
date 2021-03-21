import { CreateOptions, DataTypes, Model, Sequelize } from "sequelize";
import { assert, copyIn } from "../utils";

export class User extends Model {
  // fields
  username: string;
  blocked = false;
  validTokens: number[] = []; // list of token's claims.iat

  // standard fields
  id: bigint;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;

  constructor(values?: Readonly<Partial<User>>, options?: CreateOptions) {
    super(values, options);
    copyIn(this, values);
    assert(!!this.username);

    // it is an error to instantiate a model using 'new': it is missing the
    // creation options and messes with the isNewRecord property.
    const check = { stack: "" };
    Error.captureStackTrace(check);
    if (check.stack.indexOf("at Function.build") < 0) {
      throw new Error("use Model.build() or Model.create() instead of 'new'");
    }
  }
}

export function init(sequelize: Sequelize) {
  User.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      // the retrun value of a BIGINT may be a string or a number, depending on it's size.
      // we need to always return a bigint
      get() {
        const rc = this.getDataValue("id");
        return BigInt(String(rc)).valueOf();
      },
    },
    username: {
      type: DataTypes.STRING(128),
      // @ts-expect-error << node-sequelize-noupdate-attributes
      noUpdate: { readOnly: true },
      unique: true,
      allowNull: false,
    },
    blocked: DataTypes.BOOLEAN,
    validTokens: DataTypes.JSON,
  }, {
    sequelize,
    tableName: "user",
    comment: "Users",
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid: true,
  });
}
