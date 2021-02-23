import { Context } from "koa";
import { User } from "../models";
import { signToken, verifyToken } from "../utils";
import { afterLogin, parseToken, refresh, requireAuthorization, revoke } from "./authorization";


describe("authorization middleware", () => {

  let secret: string;

  beforeAll(() => {
    secret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "testSecret";
  });

  afterAll(() => {
    process.env.JWT_SECRET = secret;
  });


  const getCtx = () => {
    const ctx: Partial<Context> = {
      status: 0,
      request: {
        headers: {},
        get: ((str: string) => ctx.request.headers[str] || ""),
      } as never,
      body: "",
      href: "test",
      state: {},
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
      set: jest.fn((str, _val) => { expect(str).toBeTruthy(); }) as never,
      assert: jest.fn((val: boolean, _code: number, str: string) => { if (!val) throw new Error(str); }) as never,
      cookies: { set: jest.fn((name, _val, _opts) => { expect(name).toBeTruthy(); return ctx; }) } as never,
    };
    return ctx as Context;
  };


  test("parseToken positive", async () => {

    const user = expect.getState().currentTestName;
    const token = signToken({ user });
    const ctx = getCtx();

    ctx.request.headers.Authorization = token;  // eslint-disable-line

    await parseToken(ctx, async () => { return Promise.resolve(); });
    expect(ctx.state.user).toEqual(user);
  });

  test("requireAuthorization positive", async () => {

    const user = expect.getState().currentTestName;
    const token = signToken({ user });

    const fn = jest.spyOn(User, "findOne").mockResolvedValueOnce({
      username: user,
      blocked: false,
    } as User);

    const ctx = getCtx();
    ctx.request.headers.Authorization = token;  // eslint-disable-line

    await requireAuthorization(ctx, async () => { return Promise.resolve(); });
    expect(ctx.state.user).toEqual(user);
    fn.mockClear();
  });


  test("user cache minimize calls to db", async () => {

    const user = expect.getState().currentTestName;

    const fn = jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: false,
    } as User);

    const ctx = getCtx();
    ctx.request.headers.Authorization = signToken({ user });

    expect(fn).toHaveBeenCalledTimes(0);
    await requireAuthorization(ctx, async () => { return Promise.resolve(); });
    expect(ctx.state.user).toEqual(user);
    expect(fn).toHaveBeenCalledTimes(1);

    // re-run the same ctx
    delete ctx.state.user;
    delete ctx.state.jwt;
    await requireAuthorization(ctx, async () => { return Promise.resolve(); });
    await requireAuthorization(ctx, async () => { return Promise.resolve(); });

    expect(fn).toHaveBeenCalledTimes(1);
    fn.mockClear();

  });


  test("requireAuthorization negative", async () => {

    const ctx = getCtx();
    await expect(
      requireAuthorization(ctx, async () => { return Promise.resolve(); }),
    ).rejects.toThrow(/required/);
  });


  test("blocked user is unauthorized", async () => {

    const user = expect.getState().currentTestName;

    const fn = jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: true,
    } as User);

    const ctx = getCtx();
    ctx.state.user = user;
    ctx.state.jwt = verifyToken(signToken({ user }));

    await expect(
      requireAuthorization(ctx, async () => { return Promise.resolve(); }),
    ).rejects.toThrow(/blocked/);

    expect(fn).toHaveBeenCalled();
    fn.mockClear();
  });

  test("fail on token that have been revoked", async () => {

    const user = expect.getState().currentTestName;
    const token = signToken({ user });

    const fn = jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: false,
      validTokens: [100],
    } as User);

    const ctx = getCtx();
    ctx.request.headers.Authorization = token;  // eslint-disable-line

    await expect(
      requireAuthorization(ctx, async () => { return Promise.resolve(); }),
    ).rejects.toThrow(/revoked/);

    expect(ctx.state.user).toEqual(user);
    fn.mockClear();
  });


  test("fail login on blocked user", async () => {

    const user = expect.getState().currentTestName;

    const fn = jest.spyOn(User, "findOrCreate").mockResolvedValue([{
      username: user,
      blocked: true,
    } as User, false]);

    const ctx = getCtx();
    await expect(
      afterLogin(ctx, user),
    ).rejects.toThrow(/blocked/);

    expect(fn).toHaveBeenCalled();
    fn.mockClear();

  });


  test("refresh positive", async () => {

    const user = expect.getState().currentTestName;
    const ctx = getCtx();
    ctx.state.user = user;
    ctx.state.jwt = verifyToken(signToken({ user }));

    const save = jest.fn(async (_opts) => { return Promise.resolve({} as User); });
    const fn = jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: false,
      validTokens: [100, ctx.state.jwt.iat],
      save,
    } as unknown as User);


    await refresh(ctx);
    expect(typeof ctx.body.token).toEqual("string");
    expect(ctx.status).toEqual(200);
    expect(save).toHaveBeenCalled();
    fn.mockClear();
  });


  test("revoke positive", async () => {

    const user = expect.getState().currentTestName;
    const ctx = getCtx();
    ctx.state.user = user;
    ctx.state.jwt = verifyToken(signToken({ user }));

    const save = jest.fn(async (_opts) => { return Promise.resolve({} as User); });
    const fn = jest.spyOn(User, "findOne").mockResolvedValueOnce({
      username: user,
      blocked: false,
      validTokens: [ctx.state.jwt.iat, 100],
      save,
    } as unknown as User);


    await revoke(ctx);
    expect(ctx.cookies.set).toHaveBeenCalled();   // eslint-disable-line
    expect(ctx.body.ok).toBeTruthy();   // eslint-disable-line
    expect(save).toHaveBeenCalled();
    fn.mockClear();

  });

});