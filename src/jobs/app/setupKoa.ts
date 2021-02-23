import * as Koa from "koa";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import compress from "koa-compress";
import koaLogger from "koa-logger";
import createRouter from "koa-joi-router";
import { userAgent } from "koa-useragent";
import { Sequelize } from "sequelize";

import { env, getLogger, info, LogLevel } from "../../utils";
import { errorHandler, koaOnError, setWarnRespTime } from "../../middleware/errorHandler";
import { init as staticSite } from "../../middleware/staticSite";
import { parseToken, requireAuthorization } from "../../middleware/authorization";
import { init as openApiDocs } from "../../middleware/openApiDocs";
import { init as healthcheck } from "../../controllers/healthcheck";
import { init as oauthGitHub } from "../../controllers/oauthGithub";
import { Bridge } from "../../libs/cluster";


function corsOptions(whitelist: string[]) {
  return {
    origin: (ctx: Koa.Context) => {
      const origin = ctx.request.get("origin");
      return whitelist.find(r => r === origin) || "";
    },
    credentials: true,
  };
}


export function setupKoa(koa: Koa, client: Bridge, db: Sequelize) {

  const { ROUTER_BASE_PATH, CORS_WHITELIST, NODE_ENV } = process.env;
  const httpLogger = getLogger("http", LogLevel.info);
  const whitelist: [] = !!CORS_WHITELIST ? JSON.parse(CORS_WHITELIST) : [];

  // set app middleware
  koa.on("error", koaOnError)
    .use(koaLogger(str => { httpLogger.info(str); }))
    .use(errorHandler)
    .use(cors(corsOptions(whitelist)));

  if (!env.isDebugging) {
    // no point in getting timeout warnings when debugging
    setWarnRespTime(Number.MAX_SAFE_INTEGER);
    if (NODE_ENV === "production") {
      // keep the network loggers with full-text responses
      koa.use(compress());
    }
  }

  koa.use(userAgent)     // addes ctx.userAgent
    .use(bodyParser());

  const publicRouter = createRouter();

  // setup public routes
  koa.use(staticSite("./public", "/"));
  publicRouter.use(parseToken);
  healthcheck(publicRouter, db, client);
  oauthGitHub(publicRouter);
  openApiDocs(publicRouter);

  koa.use(publicRouter.middleware());

  // setup private routes
  const routerV1 = createRouter();
  routerV1.prefix(ROUTER_BASE_PATH);
  routerV1.use(requireAuthorization);
  // ...

  koa.use(routerV1.middleware());

  info("koa app initialized");
  return koa;
}

/***
// app.use(authorizeSecret);
// app.use(koaJwt(restApp.koaJWTOptions).unless({ path: [/^\/favicon.ico/] }))

// Security headers
app.use(koaHelmet());
app.use(koaHelmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"] } }));
app.use(koaHelmet.frameguard('deny'));

// DB connection
app.use(connectToDbMiddleware(pool.connect, appLogger, config.apps.api.db));
***/
