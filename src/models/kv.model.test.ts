import { Options } from "sequelize";
import { initDb } from "./db";
import { KVStore } from "./kv.model";

describe("KVStore", () => {

  beforeAll(async () => {
    const opts: Options = {
      storage: ":memory:",
      dialect: "sqlite",
    };

    const db = initDb(opts);
    await db.sync({ force: true });
  });

  test("save and retrieve kv entry", async () => {
    const name = expect.getState().currentTestName;
    const kv = new KVStore(name);
    await kv.set("key1", "val1", 10000);
    await expect(
      kv.get("key1"),
    ).resolves.toEqual("val1");
  });

  test("expired key is not returned", async () => {
    const name = expect.getState().currentTestName;
    const kv = new KVStore(name);
    await kv.set("key2", "val2", -1);
    await expect(
      kv.has("key2"),
    ).resolves.toBeFalsy();
  });

  test("deleted key is not returned", async () => {
    const name = expect.getState().currentTestName;
    const kv = new KVStore(name);
    await kv.set("key3", "val3", 10000);
    await expect(
      kv.has("key3"),
    ).resolves.toBeTruthy();
    await kv.delete("key3");
    await expect(
      kv.has("key3"),
    ).resolves.toBeFalsy();
  });

  test("long key should assert", async () => {
    const name = expect.getState().currentTestName;
    const kv = new KVStore(name);
    const longkey = "".padEnd(130, "0");
    await expect(
      kv.set(longkey, "val4"),
    ).rejects.toThrow(/128/);
  });
});
