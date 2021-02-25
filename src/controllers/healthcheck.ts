import * as Koa from "koa";
import joiRouter from "koa-joi-router";
import { Sequelize } from "sequelize";
import Joi from "joi";
import { env, IDictionary, ROJO } from "../utils";
import { apm } from "../utils/apm";
import { Bridge } from "../libs/cluster";

const meta = {
  swagger: {
    summary: "Health check",
    description: "Get application health check status",
    tags: ["healthcheck"],
  },
};

type JoiV = IDictionary<Joi.SchemaLike>;

const validate: JoiV = {
  /** * RUNTMIME ERROR: see https://github.com/chuyik/koa-joi-router-docs/issues/26
  params: {},
  query: Joi.object({ apm: Joi.boolean().description("add APM data to status output").optional() }).optional(),
  output: Joi.object({
    "200-299": {
      body: Joi.object({ ok: Joi.boolean().description("status") })
        .options({ allowUnknown: true })
        .description("status object"),
    },
    "400-599": {
      body: Joi.object({ message: Joi.string().description("error message") })
        .description("error body"),
    },
  }),
  */
};

let client: Bridge;
let db: Sequelize;

async function handler(ctx: Koa.Context2, _next: Koa.Next) {

  let err: Error;
  let skipPing = false;

  ctx.body = ctx.body || {};

  // make sure we can talk to database
  try {
    const rc = await db.query("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') timestamp") as ROJO;
    ctx.body.timestamp = rc[0][0].timestamp; // 2013-10-07T08:23:19.120Z
  } catch (e) {
    err = e;
  }

  // get apm from this process or cluster
  if (typeof ctx.query?.apm !== "undefined") {
    if (ctx.query.apm === "true") {
      const resp = await client.send("apm");
      if (resp.error) {
        err = new Error(resp.error);
      }
      ctx.body.apm = resp.apm;
      skipPing = true;
    } else {
      ctx.body.apm = apm.getAll();
    }
  }

  // make sure we can talk to cluster
  if (!skipPing) {
    const resp = await client.send("ping");
    if (resp.error) {
      err = new Error(resp.error);
    }
  }

  // response
  ctx.status = 200;
  ctx.set("Cache-Control", "no-cache");
  ctx.type = "json";
  ctx.body = {
    ...ctx.body,

    ok: (!err),

    app: process.env.APP_NAME,
    releaseId: env.releaseId,
    workerId: env.workerId,
    uptime: Math.round(process.uptime()),
    heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  };

  if (err) {
    ctx.body.error = err.message;
  }

  if (ctx.state?.user) {
    ctx.body.user = ctx.state.user;
  }
}

export function init(router: joiRouter.Router, db_: Sequelize, client_: Bridge) {
  client = client_;
  db = db_;

  router.route({
    method: ["GET"],
    path: "/_healthcheck",
    pre: undefined, // <<< auth here
    handler,
    validate,
    meta,
  });
}
