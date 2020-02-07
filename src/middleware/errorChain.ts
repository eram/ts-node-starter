import HttpErrors from 'http-errors';
import Koa from 'koa';
import { getCounters } from '../counters';
import { error, IndexSig, warn } from '../utils';

// error chain is used by deeper levels of the app to send errors found up the chain.
// we also handle here context errors and koa app errors

export async function errorChainHandler(ctx: Koa.Context, next: () => Promise<void>) {

    const state = ctx.state as IndexSig;
    state.errorChain = [];

    await next().catch((err: HttpErrors.HttpError) => {

        // we're not sure that this exception is coming from a "proper" http error
        // so we need to validate whatever we've got here has the right structure
        if (typeof err === 'object' && typeof err.message === 'string') {
            getCounters().errors++;

            ctx.status = err.statusCode || err.status || 500;
            ctx.type = 'json';
            if (!ctx.message.length) {
                ctx.message = err.message;
            }

            ctx.body = {
                error: (err.message) ? err.message : 'Internal server error'
            };

            // on dev send the stack to the client
            if (!getCounters().production && !!err.stack) {
                ctx.body = {
                    ...ctx.body,
                    code: err.code,
                    stack: err.stack
                };
            }

            ctx.state.errorChain.push(`${ctx.href} ${ctx.status}: ${err.stack}`);
        }
    });

    if (ctx.status >= 400 && !state.errorChain.length) {
        state.errorChain.push(`${ctx.href} ${ctx.status}: ${JSON.stringify(ctx.body, undefined, 2)}`);
    }

    if (state.errorChain.length) {
        let msg = '';
        let errors = 0;
        state.errorChain.forEach((str: string) => { msg += `${errors++}: \"${str}\",\n`; });
        error(`errorChain: [\n${msg}   ]`);
    }
}

export function appendError(ctx: Koa.Context, err: string) {

    const state = ctx.state as IndexSig;
    if (state && state.errorChain) {
        state.errorChain.push(err);
    }
}

// koa.onError function
export function koaOnError(err: Error, ctx?: Koa.Context) {

    warn('Koa onError:', err);
    getCounters().errors++;

    // ctx exists if this is error inside a request context
    if (ctx) {
        const details = {
            url: (ctx.request) ? ctx.request.url : '',
            status: ctx.status,
            ...err
        };
        appendError(ctx, JSON.stringify(details, undefined, 2));
    }
}
