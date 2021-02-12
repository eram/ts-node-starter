import { Context, Request } from "koa";
import { User } from "../models";
import { signToken } from "../utils";
import { parseToken, requireAuthorization } from "./authorization";

describe("authorization middleware", () => {

  let save: string;

  beforeAll(() => {
    save = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "testSecret";
  });

  afterAll(() => {
    process.env.JWT_SECRET = save;
  });


  const getCtx = (): Partial<Context> => {
    const ctx = {
      status: 0,
      request: {
        headers: {},
        get: function (str: string) {
          // eslint-disable-next-line @typescript-eslint/no-invalid-this
          return this.headers[str];
        },
      } as unknown as Request,
      body: "",
      href: "test",
      state: {},
      assert: ((val: unknown) => {
        if (!val) throw new Error("test");
      }) as never,
    };
    ctx.request.get.bind(ctx.request);
    return ctx;
  };


  test("parseToken positive", async () => {

    const user = "test";
    const token = signToken({ user });
    const ctx = getCtx();

    ctx.request.headers.Authorization = token;  // eslint-disable-line

    await parseToken(ctx as Context, async () => { return Promise.resolve(); });
    expect(ctx.state.user).toEqual(user);
  });


  test("requireAuthorization positive", async () => {

    const user = "test";
    const token = signToken({ user });

    jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: false,
    } as User);

    const ctx = getCtx();
    ctx.request.headers.Authorization = token;  // eslint-disable-line

    await requireAuthorization(ctx as Context, async () => { return Promise.resolve(); });
    expect(ctx.state.user).toEqual(user);
  });


  test("requireAuthorization negative", async () => {

    const ctx = getCtx();
    await expect(
      requireAuthorization(ctx as Context, async () => { return Promise.resolve(); }),
    ).rejects.toThrow("test");
  });


  test("blocked user cannot login", async () => {

    const user = "test";
    const token = signToken({ user });

    const fn = jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: true,
    } as User);

    const ctx = getCtx();
    ctx.request.headers.Authorization = token;

    await expect(
      requireAuthorization(ctx as Context, async () => { return Promise.resolve(); }),
    ).rejects.toThrow("test");

    expect(fn).toHaveBeenCalled();
  });

  test("fail on token that have been removed", async () => {

    const user = "test";
    const token = signToken({ user });

    jest.spyOn(User, "findOne").mockResolvedValue({
      username: user,
      blocked: false,
      validTokens: [100],
    } as User);

    const ctx = getCtx();
    ctx.request.headers.Authorization = token;  // eslint-disable-line

    await expect(
      requireAuthorization(ctx as Context, async () => { return Promise.resolve(); }),
    ).rejects.toThrow("test");

    expect(ctx.state.user).toEqual(user);
  });


});