import { Options, WhereOptions } from "sequelize";
import { initDb } from "./db";
import { User } from "./user.model";

describe("user", () => {

  beforeAll(async () => {
    const opts: Options = {
      dialect: "sqlite",
      storage: ":memory:",
    };

    const db = initDb(opts);
    await db.sync({ force: true });
  });

  test("create with new should throw", () => {
    expect(() => new User({ username: "user0" })).toThrow(/build/);
  });

  test("create user with revokedTokens", async () => {
    const iat = Date.now() / 1000;
    await User.create({ username: "user1", validTokens: [iat, iat + 1] });

    const where: WhereOptions = { where: { username: "user1" } };
    const found = await User.findOne(where);
    expect(found).toBeTruthy();
    expect(found.id).toBeTruthy();
    expect(found.username).toEqual("user1");
    expect(found.validTokens).toEqual([iat, iat + 1]);
  });

  test("save user model", async () => {
    await User.create({ username: "user2" });

    const where: WhereOptions = { where: { username: "user2" } };
    const found = await User.findOne(where);
    expect(found).toBeTruthy();
    expect(found.id).toBeTruthy();
    expect(found.username).toEqual("user2");
    expect(found.createdAt).toBeTruthy();
  });

  test("save after build and update username should not throw", async () => {
    const user = User.build({ username: "user3" });
    user.username = "user4";
    await expect(user.save()).resolves.toBeTruthy();
  });

  test("save after create and update username should throw", async () => {
    const user = await User.create({ username: "user3" });
    user.username = "user4";
    await expect(user.save()).rejects.toThrow(/Validation/);
  });

});
