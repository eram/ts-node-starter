import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import compress from "koa-compress";
import koaLogger from "koa-logger";
import koaHelmet from "koa-helmet";
import createRouter from "koa-joi-router";
import { userAgent } from "koa-useragent";
import { Sequelize } from "sequelize";
import Koa from "../../utils/koa";
import { env, getLogger, info, LogLevel } from "../../utils";
import { errorHandler, koaOnError, setWarnRespTime } from "../../middleware/errorHandler";
import { init as staticSite } from "../../middleware/staticSite";
import { parseToken, requireAuthorization } from "../../middleware/authorization";
import { init as openApiDocs } from "../../middleware/openApiDocs";
import { init as healthcheck } from "../../controllers/healthcheck";
import { init as oauthGitHub } from "../../controllers/oauthGithub";
import { init as tsSPA } from "../../middleware/tsSPA";
import { Bridge } from "../../libs/cluster";
import { corsOptions, helmetOptions } from "../../libs/secure";


export function setupKoa(koa: Koa, client: Bridge, db: Sequelize) {

  const { ROUTER_BASE_PATH, NODE_ENV } = process.env;
  const httpLogger = getLogger("http", LogLevel.info);

  // set app middleware
  koa.on("error", koaOnError)
    .use(koaLogger(str => { httpLogger.info(str); }))
    .use(errorHandler);

  // Security headers
  koa.use(koaHelmet(helmetOptions()))
    .use(cors(corsOptions()));

  // no point in getting timeout warnings when debugging
  if (!env.isDebugging) {
    setWarnRespTime(Number.MAX_SAFE_INTEGER);
  }
  // keep the network loggers with full-text responses
  if (NODE_ENV === "production") {
    koa.use(compress());
  }

  koa.use(userAgent)      // addes ctx.userAgent
    .use(bodyParser());

  const publicRouter = createRouter();

  // setup public routes
  koa.use(staticSite("./public", "/"));

  // setup single-page-application
  koa.use(tsSPA("./src/spa", "/app"))
    .use(staticSite("./src/spa", "/app"));

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
