import { sleep } from "./asyncs";
import { signToken, verifyToken } from "./jwt";

describe("jwt", () => {

  let save: string;
  let old: string;

  beforeAll(() => {
    save = process.env.JWT_SECRET;
    old = process.env.JWT_SECRET_OLD;
    process.env.JWT_SECRET = "testSecret";
    process.env.JWT_SECRET_OLD = "oldSecret";
  });

  afterAll(() => {
    process.env.JWT_SECRET = save;
    process.env.JWT_SECRET_OLD = old;
  });

  test("positive", () => {

    const username = "positive@domain.com";
    const token = signToken({ user: username, prop1: "test" });
    expect(typeof token === "string").toBeTruthy();

    const claims = verifyToken(token);
    expect(claims.error).toBeUndefined();
    expect(claims.user).toEqual(username);
    expect(claims.prop1).toEqual("test");
  });


  test("old secret", () => {

    const username = "old@domain.com";
    process.env.JWT_SECRET = process.env.JWT_SECRET_OLD;
    const token = signToken({ user: username, prop1: "test" });
    expect(typeof token === "string").toBeTruthy();

    process.env.JWT_SECRET = "noSecret";
    const claims = verifyToken(token);
    expect(claims.error).toBeUndefined();
    expect(claims.user).toEqual(username);
    expect(claims.prop1).toEqual("test");

    process.env.JWT_SECRET = save;
    process.env.JWT_SECRET_OLD = old;
  });

  test("negative", () => {

    const token = "negative@domain.com";
    const claims = verifyToken(token);
    expect(claims.isValid).toBeFalsy();
    expect(claims.user).toBeUndefined();
  });

  test("expired", async () => {

    const token = signToken({}, "0m");
    expect(typeof token === "string").toBeTruthy();

    await sleep(100);
    const claims = verifyToken(token);
    expect(claims.error).toEqual("jwt expired");
    expect(claims.user).toBeUndefined();
  });
});