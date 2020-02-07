// initialize config
// tslint:disable-next-line: no-require-imports
const config = require('./utils/config').export;
import Koa from 'koa';
import joiRouter from 'koa-joi-router';
import { getCounters } from './counters';
import { healthcheckHandler } from './middleware/healthcheck';
import { throwHandler } from './middleware/throw';
import { setupKoa } from './setupKoa';
import { error, info, ProcHandlers, setProcHandlers as setupProcHandlers, sleep } from './utils';

// main application entry point
/* istanbul ignore file */
export async function main(): Promise<number> {

    const hands = new ProcHandlers(getCounters());
    setupProcHandlers(hands);

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

function setupRouter(router: joiRouter.Router) {

    const prefix = process.env.APP_ROOT || '/';
    router.prefix(prefix);

    router.route({
        method: 'GET',
        path: '/_healthcheck',
        handler: healthcheckHandler,
        validate: {} // TODO: add validations
     });

     // for debug purpose only!
    if (!getCounters().production) {
        router.route({
            method: 'GET',
            path: '/_throw',
            handler: throwHandler
         });
    }
}
