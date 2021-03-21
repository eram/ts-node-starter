import * as Koa from "koa";
import { URL, URLSearchParams } from "url";
import joiRouter from "koa-joi-router";
import axios from "axios";
import { Options } from "sequelize";
import { init } from "./oauthGithub";
import { IDictionary } from "../utils";
import { initDb } from "../models";

const href = "http://a.local/jest";

describe("oauthGithub tests", () => {

  const oauth: IDictionary<joiRouter.FullHandler> = {};

  beforeAll(async () => {
    const opts: Options = {
      dialect: "sqlite",
      storage: ":memory:",
    };

    const db = initDb(opts);
    await db.sync({ force: true });

    process.env.JWT_SECRET = "testSecret";
    process.env.PUBLIC_URL = "http://a.local";
    process.env.OAUTH_GITHUB_CLIENT_ID = "gitClientId";
    process.env.OAUTH_GITHUB_SECRET = "gitSecret";

    const router = joiRouter();
    init(router);

    // @ts-expect-error
    oauth.login = router.routes[0].handler[0] as joiRouter.FullHandler;
    // @ts-expect-error
    oauth.refresh = router.routes[1].handler[0] as joiRouter.FullHandler;
    // @ts-expect-error
    oauth.revoke = router.routes[2].handler[0] as joiRouter.FullHandler;
  });

  test("login calls redirect", async () => {

    const ctx: Partial<Koa.Context> = {
      href,
      redirect: jest.fn((str) => { expect(str).toBeTruthy(); }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return str === "Referrer" ? href : undefined; }),
      assert: jest.fn((val: boolean, _code: number, str: string) => { if (!val) throw new Error(str); }) as never,
    };

    await oauth.login(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).toHaveBeenCalled();
  });

  const commonLogin1 = async () => {
    let state = "";
    const ctx: Partial<Koa.Context> = {
      href,
      redirect: jest.fn((uri) => {
        expect(uri).toBeTruthy();
        const url2 = new URL(uri);
        state = url2.searchParams.get("state") || "";
      }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return str === "Referrer" ? href : undefined; }),
      assert: jest.fn((val: boolean, _code: number, str: string) => { if (!val) throw new Error(str); }) as never,
    };

    await oauth.login(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).toHaveBeenCalled();
    expect(state.length > 0).toBeTruthy();
    return state;
  };

  const commonLogin2 = async (state: string) => {
    let user = "";
    const url = new URL(`http://a.local/jest?code=1&state=${state}`);
    const ctx: Partial<Koa.Context> = {
      href: url.href,
      query: {},
      redirect: jest.fn((uri) => {
        expect(uri).toBeTruthy();
        const url2 = new URL(uri);
        user = url2.searchParams.get("user") || "";
      }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return str === "Referrer" ? href : undefined; }),
      assert: ((v: boolean, status?: number, err?: string) => { if (!v) throw new Error(err); }) as never,
      cookies: { set: jest.fn((name, val, _opts) => { expect(name && val).toBeTruthy(); return ctx; }) } as never,
    };
    const params = new URLSearchParams(url.search);
    params.forEach((n, v) => { ctx.query[v] = n; });

    await oauth.login(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).toBeCalled();
    return user;
  };

  test("github positive flow", async () => {

    const state = await commonLogin1();
    expect(state.length > 0).toBeTruthy();

    // Oauth.authService
    const mock1 = jest.spyOn(axios, "get").mockReturnValueOnce(Promise.resolve({
      status: 200,
      data: {
        access_token: "aToken", // eslint-disable-line
      },
    }));

    // Oauth.graphqlService
    const mock2 = jest.spyOn(axios, "post").mockReturnValueOnce(Promise.resolve({
      status: 200,
      data: {
        data: {
          viewer: {
            login: "test",
          },
        },
      },
    }));

    const user = await commonLogin2(state);
    expect(user).toEqual("test");

    expect(mock1).toHaveBeenCalled();
    mock1.mockClear();
    expect(mock2).toHaveBeenCalled();
    mock2.mockClear();
  });

  test("github missing code from service", async () => {
    const state = await commonLogin1();
    expect(state.length > 0).toBeTruthy();

    const token = await commonLogin2("");
    expect(!!token).toBeFalsy();
  });

  test("github service is down", async () => {

    const state = await commonLogin1();
    expect(state.length > 0).toBeTruthy();

    const mock1 = jest.spyOn(axios, "get").mockReturnValue(Promise.resolve({
      status: 523,
    }));
    const mock2 = jest.spyOn(axios, "post").mockReturnValue(Promise.resolve({
      status: 523,
    }));

    const token = await commonLogin2(state);
    expect(!!token).toBeFalsy();

    expect(mock1).toHaveBeenCalled();
    mock1.mockClear();
    expect(mock2).not.toHaveBeenCalled();
    mock2.mockClear();
  });

  test("github service invalid code", async () => {

    const state = await commonLogin1();
    expect(state.length > 0).toBeTruthy();

    // Oauth.authService
    const mock1 = jest.spyOn(axios, "get").mockReturnValue(Promise.resolve({
      status: 401,
    }));
    // Oauth.graphqlService
    const mock2 = jest.spyOn(axios, "request").mockReturnValueOnce(Promise.resolve({
      status: 200,
      body: {
        data: {
          viewer: {
            login: "eram",
          },
        },
      },
    }));

    const token = await commonLogin2(state);
    expect(!!token).toBeFalsy();

    expect(mock1).toHaveBeenCalledTimes(1);
    mock1.mockClear();
    expect(mock2).toHaveBeenCalledTimes(0);
    mock2.mockClear();
  });

  test("github service invalid token", async () => {

    const state = await commonLogin1();
    expect(state.length > 0).toBeTruthy();

    // Oauth.authService
    const mock1 = jest.spyOn(axios, "get").mockReturnValue(Promise.resolve({
      status: 200,
      body: {
        access_token: "aToken", // eslint-disable-line
      },
    }));

    // Oauth.graphqlService
    const mock2 = jest.spyOn(axios, "request").mockReturnValue(Promise.resolve({
      status: 200,
      body: {
        data: null,   // eslint-disable-line
        errors: [{ message: "test error" }],
      },
    }));

    const token = await commonLogin2(state);
    expect(!!token).toBeFalsy();

    expect(mock1).toHaveBeenCalledTimes(1);
    mock1.mockClear();
    expect(mock2).toHaveBeenCalledTimes(0);
    mock2.mockClear();
  });
});
