import * as Koa from "koa";
import { URL, URLSearchParams } from "url";
import joiRouter from "koa-joi-router";
import { init } from "./oauthGithub";
import { IDictionary } from "../utils";
import axios from "axios";
import { Options } from "sequelize";
import { initDb, User } from "../models";

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
    await User.create({ username: "blocked", blocked: true });
    await User.create({ username: "refresh", validTokens: [0] });
    await User.create({ username: "revoke", validTokens: [1] });

    process.env.JWT_SECRET = "testSecret";
    process.env.PUBLIC_URL = "";
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
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
    };

    await oauth.login(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).toHaveBeenCalled();
  });

  const commonLogin = async () => {
    let state = "";
    const ctx: Partial<Koa.Context> = {
      href,
      redirect: jest.fn((uri) => {
        expect(uri).toBeTruthy();
        const url2 = new URL(uri);
        state = url2.searchParams.get("state") || "";
      }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
    };

    await oauth.login(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).toHaveBeenCalled();
    expect(state.length > 0).toBeTruthy();
    return state;
  };

  const commonLogin2 = async (state: string) => {
    let token = "";
    const url = new URL(`http://a.local/jest?code=1&state=${state}`);
    const ctx: Partial<Koa.Context> = {
      href: url.href,
      query: {},
      redirect: jest.fn((uri) => {
        expect(uri).toBeTruthy();
        const url2 = new URL(uri);
        token = url2.searchParams.get("token") || "";
      }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
      assert: ((v: boolean, status?: number, err?: string) => { if (!v) throw new Error(err); }) as never,
    };
    const params = new URLSearchParams(url.search);
    for (const k of params) {
      ctx.query[k[0]] = k[1];
    }

    await oauth.login(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).toBeCalled();
    return token;
  };

  test("github positive flow", async () => {

    const state = await commonLogin();
    expect(state.length > 0).toBeTruthy();

    // Oauth.authService
    const mock1 = jest.spyOn(axios, "get").mockReturnValueOnce(Promise.resolve({
      status: 200,
      data: {
        access_token: "aToken",     // eslint-disable-line
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

    const token = await commonLogin2(state);
    expect(token.length).toBeGreaterThan(4);

    expect(mock1).toHaveBeenCalled();
    mock1.mockClear();
    expect(mock2).toHaveBeenCalled();
    mock2.mockClear();
  });

  test("github negative: blocked user", async () => {

    const state = await commonLogin();
    expect(state.length > 0).toBeTruthy();

    // Oauth.authService
    const mock1 = jest.spyOn(axios, "get").mockReturnValueOnce(Promise.resolve({
      status: 200,
      data: {
        access_token: "aToken",     // eslint-disable-line
      },
    }));

    // Oauth.graphqlService
    const mock2 = jest.spyOn(axios, "post").mockReturnValueOnce(Promise.resolve({
      status: 200,
      data: {
        data: {
          viewer: {
            login: "blocked",
          },
        },
      },
    }));

    const token = await commonLogin2(state);
    expect(!!token).toBeFalsy();

    expect(mock1).toHaveBeenCalled();
    mock1.mockClear();
    expect(mock2).toHaveBeenCalled();
    mock2.mockClear();
  });

  test("github missing code from service", async () => {
    const state = await commonLogin();
    expect(state.length > 0).toBeTruthy();

    const token = await commonLogin2("");
    expect(!!token).toBeFalsy();
  });

  test("github service is down", async () => {

    const state = await commonLogin();
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

    const state = await commonLogin();
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

    const state = await commonLogin();
    expect(state.length > 0).toBeTruthy();

    // Oauth.authService
    const mock1 = jest.spyOn(axios, "get").mockReturnValue(Promise.resolve({
      status: 200,
      body: {
        access_token: "aToken",  // eslint-disable-line
      },
    }));

    // Oauth.graphqlService
    const mock2 = jest.spyOn(axios, "request").mockReturnValue(Promise.resolve({
      status: 200,
      body: {
        data: null,             // eslint-disable-line
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

  test("call refresh", async () => {
    const ctx: Partial<Koa.Context> = {
      state: { user: "refresh", jwt: { iat: 0 } },
      href,
      redirect: jest.fn((str) => { expect(str).toBeTruthy(); }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
      set: (jest.fn((str) => { expect(str).toBeTruthy(); })) as never,
      assert: ((v: boolean, _status?: number, err?: string) => { if (!v) throw new Error(err); }) as never,
    };

    await oauth.refresh(ctx as Koa.Context, async () => Promise.resolve());
    expect(ctx.redirect).not.toHaveBeenCalled();
    expect(typeof ctx.body.token).toEqual("string");
    expect(ctx.status).toEqual(200);

    const user = await User.findOne({ where: { username: "refresh" } });
    expect(user.validTokens.includes(0)).toBeFalsy();
    expect(user.validTokens.length).toEqual(1);
  });

  test("call refresh on blocked user", async () => {
    const ctx: Partial<Koa.Context> = {
      state: { user: "blocked", jwt: { iat: 0 } },
      href,
      redirect: jest.fn((str) => { expect(str).toBeTruthy(); }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
      set: (jest.fn((str) => { expect(str).toBeTruthy(); })) as never,
      assert: ((v: boolean, _status?: number, err?: string) => { if (!v) throw new Error(err); }) as never,
    };

    await expect(
      oauth.refresh(ctx as Koa.Context, async () => Promise.resolve()),
    ).rejects.toThrow(/blocked/);
  });

  test("call revoke", async () => {
    const ctx: Partial<Koa.Context> = {
      state: { user: "revoke", jwt: { iat: 1 } },
      href,
      redirect: jest.fn((str) => { expect(str).toBeTruthy(); }),
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
      set: (jest.fn((str) => { expect(str).toBeTruthy(); })) as never,
      assert: ((v: boolean, _status?: number, err?: string) => { if (!v) throw new Error(err); }) as never,
    };

    await oauth.revoke(ctx as Koa.Context, async () => Promise.resolve());

    // removed user cannot be refreshed
    await expect(
      oauth.refresh(ctx as Koa.Context, async () => Promise.resolve()),
    ).rejects.toThrow(/revoked/);

  });
});
