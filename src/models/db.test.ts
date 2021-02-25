import { Sequelize } from "sequelize";
import { initDb, checkDbAlive, Options } from "./db";

describe("db initialize", () => {

  const opts: Options = {
    dialect: "sqlite",
    storage: ":memory:",
  };

  let db: Sequelize;

  test("init db negative", async () => {

    db = initDb(opts);

    expect(typeof db).toEqual("object");
    expect(typeof db.models.User).toBe("function");

    await expect(checkDbAlive()).resolves.toBeFalsy();
  });

  test("init db positive", async () => {

    await db.sync({ force: true });

    expect(typeof db).toEqual("object");
    expect(typeof db.models.User).toBe("function");

    await expect(checkDbAlive()).resolves.toBeTruthy();
  });
});
