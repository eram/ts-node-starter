import Koa from "../utils/koa";
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
    const ctx: Partial<Koa.Context2> = {
      status: 0,
      request: {
        headers: {},
        get: ((str: string) => ctx.request.headers[str] || ""),
      } as never,
      body: {},
      href: "test",
      state: {},
      get: jest.fn((str) => { expect(str).toBeTruthy(); return undefined; }),
      set: jest.fn((str, _val) => { expect(str).toBeTruthy(); }) as never,
      assert: jest.fn((val: boolean, _code: number, str: string) => { if (!val) throw new Error(str); }) as never,
      cookies: { set: jest.fn((name, _val, _opts) => { expect(name).toBeTruthy(); return ctx; }) } as never,
    };
    return ctx as Koa.Context2;
  };


  test("parseToken positive", async () => {

    const user = expect.getState().currentTestName;
    const token = signToken({ user });
    const ctx = getCtx();

    ctx.request.headers.Authorization = token;

    await parseToken(ctx, async () => Promise.resolve());
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
    ctx.request.headers.Authorization = token;

    await requireAuthorization(ctx, async () => Promise.resolve());
    expect(ctx.state.user).toEqual(user);
    fn.mockRestore();
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
    await requireAuthorization(ctx, async () => Promise.resolve());
    expect(ctx.state.user).toEqual(user);
    expect(fn).toHaveBeenCalledTimes(1);

    // re-run the same ctx
    delete ctx.state.user;
    delete ctx.state.jwt;
    await requireAuthorization(ctx, async () => Promise.resolve());
    await requireAuthorization(ctx, async () => Promise.resolve());

    expect(fn).toHaveBeenCalledTimes(1);
    fn.mockRestore();
  });


  test("requireAuthorization negative", async () => {

    const ctx = getCtx();
    await expect(
      requireAuthorization(ctx, async () => Promise.resolve()),
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
      requireAuthorization(ctx, async () => Promise.resolve()),
    ).rejects.toThrow(/blocked/);

    expect(fn).toHaveBeenCalled();
    fn.mockRestore();
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
    ctx.request.headers.Authorization = token;

    await expect(
      requireAuthorization(ctx, async () => Promise.resolve()),
    ).rejects.toThrow(/revoked/);

    expect(ctx.state.user).toEqual(user);
    fn.mockRestore();
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
    fn.mockRestore();
  });


  test("refresh positive", async () => {

    const user = expect.getState().currentTestName;
    const ctx = getCtx();
    ctx.state.user = user;
    ctx.state.jwt = verifyToken(signToken({ user }));

    const save = jest.fn(async (_opts) => Promise.resolve({} as User));
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
    fn.mockRestore();
  });


  test("revoke positive", async () => {

    const user = expect.getState().currentTestName;
    const ctx = getCtx();
    ctx.state.user = user;
    ctx.state.jwt = verifyToken(signToken({ user }));

    const save = jest.fn(async (_opts) => Promise.resolve({} as User));
    const fn = jest.spyOn(User, "findOne").mockResolvedValueOnce({
      username: user,
      blocked: false,
      validTokens: [ctx.state.jwt.iat, 100],
      save,
    } as unknown as User);

    await revoke(ctx);
    expect(ctx.cookies.set).toHaveBeenCalled();
    expect(ctx.body.ok).toBeTruthy();
    expect(save).toHaveBeenCalled();
    fn.mockRestore();
  });
});
