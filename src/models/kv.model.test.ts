import { Options, WhereOptions } from "sequelize";
import { sleep } from "../utils";
import { initDb } from "./db";
import { KV } from "./kv.model";

describe("kv", () => {

  beforeAll(async () => {
    const opts: Options = {
      dialect: "sqlite",
      storage: ":memory:",
    };

    const db = initDb(opts);
    await db.sync({ force: true });
  });

  test("save and retrieve kv entry", async () => {
    const user = new KV({ key: "key1", val: "val1" });
    await user.save();

    const where: WhereOptions = { where: { key: "key1" } };
    const found = await KV.findOne(where);
    expect(found).toBeTruthy();
    expect(Object(found).id).toBeUndefined();
    expect(found.key).toEqual("key1");
    expect(found.val).toEqual("val1");
    expect(!!found.exp).toBeFalsy();
    expect(found.isValid).toBeTruthy();
    expect(found.createdAt).toBeTruthy();
  });


  test("expired key is invalid and automatically deleted", async () => {
    const user = new KV({ key: "key2", val: "val2", exp: new Date(0) });
    await user.save();

    const where: WhereOptions = { where: { key: "key2" } };
    const found = await KV.findOne(where);
    expect(found).toBeTruthy();
    expect(found.isValid).toBeFalsy();

    await sleep(10);

    const found2 = await KV.findOne(where);
    expect(found2).toBeFalsy();
  });
});
