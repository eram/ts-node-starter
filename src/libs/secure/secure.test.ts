import { cookieOptions, corsOptions, helmetOptions } from "./secure";

describe("secure", () => {

  beforeAll(() => {
    process.env.PUBLIC_URL = "http://a.local";
    process.env.SEC_CSP_OPS = "{\"default-src\":[\"'none'\"],\"connect-src\":[\"'self'\"]}";

  });

  test("corsOptions", () => {
    expect(corsOptions()).toBeTruthy();
  });

  test("cookieOptions", () => {

    expect(cookieOptions(0)).toBeTruthy();
  });

  test("helmetOptions", () => {
    expect(helmetOptions()).toBeTruthy();
  });

});
