import { sleep } from '.';
import { ProcCounters, ProcHandlers, setProcHandlers } from './processOn';

//
// NOTE!
// testing signals and crashes is out of scope for npm test suite.
// you can run it as a single file test - uncomment the below.
//
/*
describe('processOn testing', () => {

    const counters = new ProcCounters();
    const hands = new ProcHandlers(counters);
    let save: typeof process.exit;

    function dummyExit(code?: number) {
        console.log(`dummyExit: ${code}`);
    }

    beforeAll(() => {
        setProcHandlers(hands);
        save = process.exit;
        process.exit = dummyExit as (code?: number) => never;
    });

    afterAll(() => {
        setTimeout(() => {
            if (save) {
                process.exit = save;
            }
        }, 500);
    });

    it('counters.reloads untouched', () => {
        expect(hands.counters.reloads).toEqual(0);
    });

    it('terminates on SIGINT', async () => {
        expect(hands.terminating).toBe(false);
        const mySpy = jasmine.createSpy('dummyExit', dummyExit);
        try {
            process.emit('SIGINT', 'SIGINT');
        } catch (err) {
            // nothing here
        }
        await sleep(100);
        expect(hands.terminating).toBe(true);
        expect(mySpy).toHaveBeenCalled();
    });

    it('triggers on SIGHUP', () => {
        const reloads = hands.counters.reloads;
        try {
            process.emit('SIGHUP', 'SIGHUP');
        } catch (err) {
            // nothing here
        }
        expect(hands.counters.reloads).toBe(reloads + 1);
    });

    it('triggers on uncaughtException', () => {
        const errors = hands.counters.errors;
        try {
            process.emit('uncaughtException', new Error('test'));
        } catch (err) {
            // nothing here
        }
        expect(hands.counters.errors).toBe(errors + 1);
    });

    it('triggers on message', () => {
        const messages = hands.counters.messages;
        try {
            process.emit('message', 'hello', 0);
        } catch (err) {
            // nothing here
        }
        expect(hands.counters.messages).toBe(messages + 1);
    });
});
*/