import { DataTypes, Model, Sequelize } from "sequelize";
import { copyIn } from "../utils";

export class User extends Model {

  // fields with default values
  username: string;
  blocked = false;
  validTokens: number[] = [];   // list of token's claims.iat

  // standard fields
  id: bigint;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;

  constructor(user: Partial<User> = {}) {
    super();
    copyIn<User>(this, user);
  }
}

export function init(sequelize: Sequelize) {
  User.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      // the retrun value of a BIGINT may be a string or a number depending on it's size.
      // we need to always return a bigint
      get: function () {
        const rc = this.getDataValue("id");
        return BigInt(String(rc)).valueOf();
      },
    },
    username: {
      type: DataTypes.STRING(128),
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
