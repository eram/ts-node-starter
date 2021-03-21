import { CreateOptions, DataTypes, Model, Sequelize } from "sequelize";
import { assert, copyIn } from "../utils";

export class KV extends Model {

  // fields
  key: string;
  val = "";
  exp: Date;

  // standard fields
  createdAt: Date;
  updatedAt: Date;

  constructor(kv?: Readonly<Partial<KV>>, options?: CreateOptions) {
    super(kv, options);
    copyIn(this, kv);
    assert(!!this.key);

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
  timeout = 0;                                      // default item validity time
  keyfn = (str: string) => `${this.name}-${str}`;   // defauly key name in VK table
}

export class KVStore extends KVStoreParams {

  readonly MAX_LEN = Object(KV.rawAttributes.key.type)._length;

  constructor(opts: string | Readonly<Partial<KVStoreParams>>) {
    super();
    if (typeof opts === "string") {
      opts = { name: opts };
    }
    copyIn<KVStore>(this, opts);
  }

  async set(key: string, val: string, timeout?: number) {
    const kvkey = this.keyfn(key);
    assert(kvkey.length < this.MAX_LEN && val.length < this.MAX_LEN, `key and val must be shorter than ${this.MAX_LEN}`);
    timeout = (typeof timeout === "undefined") ? this.timeout : timeout;
    await KV.create({
      key: kvkey,
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
