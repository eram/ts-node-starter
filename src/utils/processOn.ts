/* istanbul ignore file */

// testing signals is out of scope for istanbul runner.
// see note in processOn.test.ts
import * as Http from 'http';
import {error, info} from '.';

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

  ['SIGINT', 'exit'].forEach(sig => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.on(sig as any, (signal: string) => {

      info(`Recieved ${sig}: ${signal}`);
      if (!hands.terminating) {
        hands.terminating = true;
        if (hands.server) {
          hands.server.close(err => {
            if (err) { error(err); }
            process.exit((err) ? 1 : 0);
          });
        }
        setTimeout(() => {
          const rc = (!hands.server || !hands.server.listening) ? 0 : 1;
          process.exit(rc);
        }, 1500);
      }
    });
  });

  process.on('SIGTERM', () => {
    info('Recieved SIGTERM');
    hands.terminating = true;
    process.exit(0);
  });

  process.on('SIGHUP', () => {
    info('Recieved SIGHUP');
    // TODO: reload config
    hands.counters.reloads++;
  });


  ['unhandledRejection', 'uncaughtException'].forEach(sig => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.on(sig as any, (err: Error) => {
      error(`Recieved ${sig}:`, err);
      hands.counters.errors++;
      throw err;
    });
  });

  // standard handler for some other signals
  // SIGUSR1 is debugger attached << do not override it!
  ['SIGUSR2', 'SIGVTALRM', 'SIGBREAK', 'SIGLOST', 'SIGINFO'].forEach(sig => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.on(sig as any, (signal: string) => {
      info(`Recieved ${sig}: ${signal}`);
    });
  });

  // handle messages from PM2
  process.on('message', msg => {

    info(`Recieved message: ${msg}`);
    hands.counters.messages++;

    switch (msg) {
      case 'shutdown':
        process.emit('SIGINT', 'SIGINT');
        break;

      default:
    }
  });
}
