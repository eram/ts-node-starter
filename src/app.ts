/* istanbul ignore file */

// initialize config
import './utils/config';
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import {getCounters} from './counters';
import {healthcheckHandler} from './middleware/healthcheck';
import {throwHandler} from './middleware/throw';
import {setupKoa} from './setupKoa';
import {error, info, ProcHandlers, setProcHandlers as setupProcHandlers} from './utils';

function setupRouter(router: joiRouter.Router) {

  const prefix = process.env.APP_ROOT || '/';
  router.prefix(prefix);

  router.route({
    method: ['GET'],
    path: '/_healthcheck',
    handler: healthcheckHandler,
    validate: {} // TODO: add validations
  });

  // for debug purpose only: trigger a throw in the error-chain middleware
  if (!getCounters().production) {
    router.route({
      method: ['GET'],
      path: '/_throw',
      handler: throwHandler
    });
  }
}

// main application entry point
export async function app(): Promise<number> {

  await Promise.resolve(); // stop complaining
  const hands = new ProcHandlers(getCounters());
  setupProcHandlers(hands);

  // any additional setup should be done here
  // ...

  // setup server and start it
  // once we start listening PM2 knows we are ready to recieve traffic. this needs to happen
  // within before the "listen_timeout" (default 3000 msec).
  const router = joiRouter();
  setupRouter(router);
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