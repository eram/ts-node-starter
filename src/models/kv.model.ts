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


export class KVStoreParams {
  name: string;
  timeout = 0;
  keyfn = (n: string) => `${this.name}-${n}`;
}

export class KVStore extends KVStoreParams {

  constructor(opts: string | Partial<KVStoreParams>) {
    super();
    if (typeof opts === "string") {
      opts = { name: opts };
    }
    copyIn<KVStore>(this, opts);
  }

  async set(key: string, val: string, timeout?: number) {
    assert(key.length + this.name.length + 1 < 128 && val.length < 128, "key and val length must be shorter than 128");
    timeout = (typeof timeout === "undefined") ? this.timeout : timeout;
    await KV.create({
      key: this.keyfn(key),
      val,
      exp: timeout ? new Date(Date.now() + timeout) : 0,
    });
  }

  async get(key: string) {
    const kv = await KV.findOne({ where: { key: this.keyfn(key) } });
    if (kv) {
      if (kv.exp && kv.exp.valueOf() <= Date.now()) {
        void kv.destroy();
        return undefined;
      }
      return kv.val;
    }
    return undefined;
  }

  async has(key: string) {
    return (await this.get(key)) !== undefined;
  }

  async delete(key: string) {
    await KV.destroy({ where: { key: this.keyfn(key) } });
  }
}
