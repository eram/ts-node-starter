import { DataTypes, Model, Sequelize } from "sequelize";
import { assert, copyIn } from "../utils";

export class KV extends Model {

  // fields
  key: string;
  val = "";
  exp: Date;

  // standard fields
  createdAt: Date;
  updatedAt: Date;

  constructor(kv: Partial<KV> = {}) {
    super();
    copyIn<KV>(this, kv);
    assert(!!this.key);
  }

  get isValid() {
    if (!!this.exp && this.exp.valueOf() < Date.now()) {
      void this.destroy();
      return false;
    }
    return true;
  }
}

export function init(sequelize: Sequelize) {
  KV.init({
    key: {
      primaryKey: true,
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    val: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    exp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    tableName: "kv",
    comment: "Key-value store",
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid: false,
  });
}
