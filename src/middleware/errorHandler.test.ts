/* eslint-disable sonarjs/no-duplicate-string */
import createError from "http-errors";
import {
  DatabaseError,
  SequelizeScopeError,
  ValidationError as SequelizeValidationError,
  ValidationErrorItem as SequelizeValidationErrorItem,
} from "sequelize";
import Joi from "joi";
import Koa from "../utils/koa";
import { User } from "../models";
import { CustomError } from "../utils/customError";
import { errorHandler, koaOnError, setWarnRespTime } from "./errorHandler";
import { apm } from "../utils/apm";
import { sleep } from "../utils";

type JoiError = Joi.ValidationError;
class CustomError2 extends CustomError { }

describe("errorHandler middleware tests", () => {

  test("Koa error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, async () => Promise.reject(new createError.BadRequest()));
    expect(ctx.status).toEqual(400);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("Bad Request");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
  });

  test("CustomError error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, async () => Promise.reject(new CustomError2("test")));
    expect(ctx.status).toEqual(500);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("test");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
    expect(ctx.body.errors[0]).toEqual({ CustomError2: "test" });   // eslint-disable-line
  });

  test("TypeError error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, async () => {
      await User.findByPk(-1);
    });
    expect(ctx.status).toEqual(500);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("Cannot convert undefined or null to object");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
  });

  test("JoiError error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, () => {
      const err: JoiError = {
        isJoi: true,
        message: "test",
        name: "ValidationError",
        details: [{
          message: "test",
          path: ["1", "2"],
          type: "type",
        }],
        annotate: () => "string",
        _original: 0,
      };
      throw err;
    });
    expect(ctx.status).toEqual(500);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("test");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
    expect(ctx.body.errors[0]).toEqual({ 1.2: "test" });
  });

  test("SequelizeValidationError error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, () => {
      throw new SequelizeValidationError("test", [
        new SequelizeValidationErrorItem("test.message", "test type", "test.path"),
      ]);
    });
    expect(ctx.status).toEqual(500);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("test");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
    expect(ctx.body.errors[0]).toEqual({ path: "message" });
  });

  test("SequelizeError error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, () => {
      throw new SequelizeScopeError("test");
    });
    expect(ctx.status).toEqual(500);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("test");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
    expect(ctx.body.errors[0]).toEqual({ SequelizeScopeError: "test" });  // eslint-disable-line
  });

  test("DatabaseError error", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
    };

    await errorHandler(ctx as Koa.Context2, () => {
      throw new DatabaseError(new Error("invalid coloum for 'test'"));
    });
    expect(ctx.status).toEqual(500);
    expect(ctx.body).toBeTruthy();
    expect(ctx.body.error).toEqual("invalid coloum for 'test'");
    expect(ctx.body.errors).toBeInstanceOf(Array);
    expect(ctx.body.errors.length).toEqual(1);
    expect(ctx.body.errors[0]).toEqual({ test: "invalid coloum" });
  });

  test("exception in chain", async () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
      message: "",
      href: "http://test",
    };

    await errorHandler(ctx as Koa.Context2, () => {
      throw createError(503, "test");
    });

    expect(ctx.status).toEqual(503);
    expect(ctx.message).toEqual("test");
    expect(typeof ctx.body).toEqual("object");
    expect(ctx.body.error).toEqual("test");
  });

  test("koaOnError works", () => {

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
      message: "",
      href: "http://test",
    };

    koaOnError(createError(503, "test"), ctx as Koa.Context2);
  });

  test("counters are updated", async () => {

    const { counters, meters, histograms } = apm;

    const httpInPorgress = counters["http.inPorgress"].val;
    const httpLatency = histograms["http.latency"].count;

    meters["http.requests"].reset();
    Object(meters["http.requests"])._rate.tick(); // simulate 1 sec passed
    const requests = meters["http.requests"].val;
    expect(requests).toEqual(0);

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
      body: {},
      set: () => { },
      href: "test",
    };

    await errorHandler(ctx as Koa.Context2, async () => {
      expect(counters["http.inPorgress"].val).toEqual((httpInPorgress + 1));
      return Promise.resolve();
    });

    expect(counters["http.inPorgress"].val).toEqual(httpInPorgress);
    Object(meters["http.requests"])._rate.tick(); // simulate 1 sec passed
    expect(meters["http.requests"].val).toEqual(0.02);
    expect(histograms["http.latency"].count).toEqual(httpLatency + 1);
  });

  test("ctx headers added on long response", async () => {

    const save = setWarnRespTime(1);

    const setFn = jest.fn((field: string, val: string) => {
      expect(typeof field === "string" && typeof val === "string").toBeTruthy();
      expect(field === "X-Response-Time" && val.indexOf("ms") > 0).toBeTruthy();
    });

    const ctx: Partial<Koa.Context2> = {
      state: {},
      status: 0,
      body: {},
      set: setFn as never,
      href: "test",
    };

    await errorHandler(ctx as Koa.Context2, async () => sleep(10));

    expect(setFn).toHaveBeenCalledTimes(1);
    setWarnRespTime(save);
  });
});
