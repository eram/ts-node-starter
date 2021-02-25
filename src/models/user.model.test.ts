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

  test("create user with revokedTokens", async () => {
    const iat = Date.now() / 1000;
    const user = new User({ username: "user1", validTokens: [iat, iat + 1] });
    await User.create(user);

    const where: WhereOptions = { where: { username: "user1" } };
    const found = await User.findOne(where);
    expect(found).toBeTruthy();
    expect(found.id).toBeTruthy();
    expect(found.username).toEqual("user1");
    expect(found.validTokens).toEqual([iat, iat + 1]);
  });

  test("save user model", async () => {
    const user = new User({ username: "user2" });
    await user.save();

    const where: WhereOptions = { where: { username: "user2" } };
    const found = await User.findOne(where);
    expect(found).toBeTruthy();
    expect(found.id).toBeTruthy();
    expect(found.username).toEqual("user2");
    expect(found.createdAt).toBeTruthy();
  });
});
