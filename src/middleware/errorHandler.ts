import {
  ValidationError as SequelizeValidationError,
  BaseError as SequelizeDatabaseError,
} from "sequelize";
import Koa from "../utils/koa";
import { env, POJO, warn } from "../utils";
import { Counter, Histogram, Meter, meter } from "../utils/apm";

const httpErrors = Meter.instance("http.errors");
const httpInPorgress = Counter.instance("http.inPorgress");
const httpTotal = Counter.instance("http.total");
const httpRequests = Meter.instance("http.requests");
const httpLatency = Histogram.instance("http.latency");

let warnRespTime = env.isDebugging ? (60 * 60 * 1000) : (Number(process.env.WARN_RESPONSE_TIME) || 100);

export function setWarnRespTime(time: number) {
  const rc = warnRespTime;
  warnRespTime = time;
  return rc;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleCatch(err: any, ctx: Koa.Context2) {

  // err is of type createError.HttpError if thrown in http context
  ctx.status = (!!ctx.status && ctx.status !== 404) ? ctx.status : (err.statusCode || err.status || 500);
  ctx.message = err.message || ctx.message || "Internal server error";
  ctx.type = "json";
  ctx.body = ctx.body || {};

  if (err.isJoi) {
    // Joi.ValidationError
    err.details.forEach((item: { path: unknown[]; message: unknown }) => {
      ctx.state.errors.push({ [String(item.path.join("."))]: item.message });
    });

  } else if (err instanceof SequelizeValidationError) {
    err.errors.forEach(errorItem => {
      const [, field] = errorItem.path.split(".");
      const [, message] = errorItem.message.split(".");
      ctx.state.errors.push({ [field]: message });
    });

  } else if (err instanceof SequelizeDatabaseError) {
    if (Object(err).parent) { // this is a DatabaseError
      const fieldNameMatch = /'(\w+)'/.exec(err.message);
      const problemMatch = /(^\D+)\sfor/.exec(err.message);
      if (fieldNameMatch && problemMatch) {
        const [, fieldName] = fieldNameMatch;
        const [, problem] = problemMatch;
        ctx.state.errors.push({ [fieldName]: problem });
      }
    } else {
      const msg = err.message || err;
      ctx.state.errors.push({ [err.name || "message"]: msg });
    }

  } else {
    // HttpError
    // CustomError
    // Error
    const msg = err.originalError?.message || err.message || err;
    ctx.state.errors.push({ [err.name || "message"]: msg });
  }

  // on dev send all errors and stack to the client
  if (process.env.NODE_ENV !== "production") {
    ctx.body.errors = ctx.state.errors;
    ctx.body.stack = err.stack;
  }
}

export async function errorHandler(ctx: Koa.Context2, next: Koa.Next) {

  ctx.state.errors = new Array<Record<string, string>>();

  const start = Date.now();
  httpInPorgress.add();
  httpRequests.add();
  httpTotal.add();

  try {
    await next();
  } catch (err) {
    handleCatch(err, ctx);
  }

  ctx.status = ctx.status || 200;

  if (ctx.status >= 400) {
    if (ctx.status >= 500) {
      httpErrors.add();
      warn("Koa error handler", POJO.stringify(ctx.state.errors));
    }

    ctx.body.error = ctx.state.errors[0]?.message || ctx.message;
  }

  const ms = Date.now() - start;
  if (ms > warnRespTime) {
    warn(`Long response time ${ms}ms: ${ctx.href}`);
    ctx.set("X-Response-Time", `${ms}ms`);
  }

  httpLatency.add(ms);
  httpInPorgress.dec();
  meter(`http.${ctx.status}`);
}

// koa.onError function
export function koaOnError(err: Error, ctx?: Koa.Context) {

  // ctx exists if this is error inside a request context
  if (ctx) {
    const details = {
      url: (ctx.request) ? ctx.request.url : "",
      status: ctx.status,
      ...err,
    };
    warn("KoaOnError", details);
  } else {
    warn("KoaOnError", err);
  }
}
