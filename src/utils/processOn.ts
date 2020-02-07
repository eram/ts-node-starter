/* istanbul ignore file */

// testing signals is out of scope for istanbul runner.
// see note in processOn.test.ts
import * as Http from 'http';
import { error, info } from './';

export class ProcCounters {
    reloads = 0;
    messages = 0;
    errors = 0;
}

export class ProcHandlers {
    terminating = false;
    server: Http.Server = undefined;
    constructor(public counters: ProcCounters) { }
}

export function setProcHandlers(hands: ProcHandlers) {

    ['SIGINT', 'SIGTERM', 'exit'].forEach(sig => {
        // tslint:disable-next-line:no-any
        process.on(sig as any, (signal: string) => {

            info(`Recieved ${signal}`);
            if (!hands.terminating) {
                hands.terminating = true;
                if (!!hands.server) {
                    hands.server.close(err => {
                        if (err) { error(err); }
                        process.exit((!!err) ? 1 : 0);
                    });
                }
                setTimeout(() => {
                    process.exit(!hands.server || !hands.server.listening ? 0 : 1);
                }, 500);
            }});
    });

    process.on('SIGHUP', () => {
        info('Recieved SIGHUP');
        // TODO: reload config
        hands.counters.reloads++;
    });

    process.on('message', msg => {
        // message from pm2
        info(`Recieved message ${msg}`);
        hands.counters.messages++;
    });

    ['unhandledRejection', 'uncaughtException'].forEach(sig => {
        // tslint:disable-next-line:no-any
        process.on(sig as any, (err: Error) => {
            error(err);
            hands.counters.errors++;
            throw err;
        });
    });

    // standard handler for some other signals
    // SIGUSR1 is debugger attached << do not override it!
    ['SIGUSR2', 'SIGVTALRM', 'SIGBREAK', 'SIGLOST', 'SIGINFO'].forEach(sig => {
        // tslint:disable-next-line:no-any
        process.on(sig as any, (signal: string) => {
            info(`Recieved ${signal}`);
        });
    });
}
