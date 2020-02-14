// initialize config
import './utils/config';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { getCounters } from './counters';
import { appendRoute as healthcheckRoute } from './routes/healthcheck';
import { appendRoute as throwRoute } from './routes/throw';
import { appendRoute as getCpuRoute } from './routes/getCpu';
import { appendRoute as getOpenApiRoute } from './routes/openApiDocs';
import { setupKoa } from './setupKoa';
import { error, info, ProcHandlers, setProcHandlers as setupProcHandlers, assert } from './utils';
import { initDb } from './repos';
import { initCpuCollector } from './controllers/cpuCollector';

// main application entry point
export async function app(): Promise<number> {

  await Promise.resolve(); // stop complaining
  const hands = new ProcHandlers(getCounters());
  setupProcHandlers(hands);

  // any additional setup should be done here
  // ...

  // init DB and repos
  assert(process.env.DB_INIT_OPTIONS && process.env.DB_INIT_OPTIONS.indexOf('\"dialect\"') > 0);
  const dbOpts = JSON.parse(process.env.DB_INIT_OPTIONS);
  const db = initDb(dbOpts, (dbOpts.dialect == 'sqlite'));

  // init controllers
  initCpuCollector(db.cpuHisotryRepo);

  // setup router
  const router = joiRouter();
  const basePath = process.env.APP_BASE_PATH || '/';
  router.prefix(basePath);

  healthcheckRoute(router, '/_healthcheck');
  getCpuRoute(router, '/getcpu/:num', db.cpuHisotryRepo);

  // for debug purpose only: trigger a throw in the error-chain middleware
  if (!getCounters().production) {
    throwRoute(router, '/_throw');
  }

  // setup swagger under '/_apiDocs' and '/_api.json'
  getOpenApiRoute(router, basePath);

  // setup server and start it
  // once we start listening PM2 knows we are ready to recieve traffic. this needs to happen
  // within before the "listen_timeout" (default 3000 msec).
  const srv = setupKoa(new Koa(), router, './public/');
  const port = Number(process.env.PORT);
  hands.server = srv.listen(port);
  if (!hands.server.listening) {
    error(`failed to start server on port ${port}`);
    return 3;
  }

  info(`Server started on http://${process.env.HOSTNAME}:${port}`);
  return 0;
}

// node entry point (TS)
app().then((rc: number) => {
  if (rc) { process.exit(rc); }
}).catch(err => {
  throw new Error(err);
});
