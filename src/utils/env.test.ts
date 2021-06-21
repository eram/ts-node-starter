import { env } from "./env";

describe("env", () => {

  test("NODE_ENV is test", () => {
    expect(["unit_test", "test", "development"].includes(process.env.NODE_ENV)).toBeTruthy();
  });

  test("env variables are loaded", () => {
    expect(process.env.PORT).toBeDefined();
  });

  test("cover defaults", () => {
    const save = { ...process.env };
    delete process.env.NODE_ENV;
    delete process.env.DOT_ENV_FILE;
    delete process.env.APP_NAME;
    delete process.env.HOSTNAME;
    delete process.env.LOG_ADD_TIME;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FORMAT;
    env.reload();
    Object.assign(process.env, save);
  });

  test("print info", () => {
    env.print();
  });
});
