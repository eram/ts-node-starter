import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import joiRouter from 'koa-joi-router';
import { userAgent } from 'koa-useragent';
import { getCounters } from './counters';
import { appendError, errorChainHandler, koaOnError } from './middleware/errorChain';
import { responseTimeHandler } from './middleware/responseTime';
import { staticSiteBuilder } from './middleware/staticSite';

export { appendError }; // make it easy for other to log errors on the chain

export function setupKoa(app: Koa, router: joiRouter.Router, rootFolder: string) {

    // set app midleware
    app.use(errorChainHandler)
        .use(responseTimeHandler)
        .use(cors());

    if (getCounters().production) {
        app.use(compress());
    }

    app.use(userAgent) // addes ctx.userAgent
        .use(bodyParser())
        .use(staticSiteBuilder(rootFolder, '/'))
        .use(router.middleware());

    app.on('error', koaOnError);
    return app;
}

/***
// app.use(authorizeSecret);
// app.use(koaJwt(restApp.koaJWTOptions).unless({ path: [/^\/favicon.ico/] }))

// Security headers
app.use(koaHelmet());
app.use(koaHelmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"] } }));
app.use(koaHelmet.frameguard('deny'));
app.use(koaCors({
    credentials: true,
    exposeHeaders: [
        'Authorization',
        'Content-Disposition',
        'Content-Type',
        'X-Entities',
    ],
    allowHeaders: [
        'Authorization',
        'Content-Disposition',
        'Content-Type',
        'X-Entities',
    ],
    allowMethods: [
        'DELETE',
        'GET',
        'POST',
        'PUT',
    ],
    origin: (ctx) => {
        const origin = ctx.get('origin');

        if (!!origin.length && config.apps.api.allowedOrigins.indexOf(origin) === -1) {
            return false;
        }

        return origin;
    },
}));

// DB connection
app.use(connectToDbMiddleware(pool.connect, appLogger, config.apps.api.db));

....

app.use(koaBodyParser());

app.use(koaMount('/api', api));
app.use(koaMount('/admin', admin));
***/
