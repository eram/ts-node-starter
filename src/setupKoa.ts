import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import joiRouter from 'koa-joi-router';
import { userAgent } from 'koa-useragent';
import { appendError, errorChainHandler } from './routes/errorChain';
import { responseTimeHandler } from './routes/responseTime';
import { staticSiteBuilder } from './routes/staticSite';
import { config, error } from './utils';
import io from '@pm2/io';

export { appendError }; // make it easy for other to log errors on the chain

export function setupKoa(app: Koa, router: joiRouter.Router, rootFolder: string) {

  // set app midleware
  app.use(errorChainHandler);
  app.use(responseTimeHandler);
  app.use(io.koaErrorHandler());
  app.use(cors());

  if (config.production) {
    app.use(compress());
  }

  app.use(userAgent); // addes ctx.userAgent
  app.use(bodyParser());
  app.use(router.middleware());
  app.use(staticSiteBuilder(rootFolder, '/'));

  app.on('error', (err) => error('Koa server error', err));
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
***/
