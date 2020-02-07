// tslint:disable-next-line: no-import-side-effect no-implicit-dependencies
import 'jasmine';
import * as Koa from 'koa';

import { healthcheckHandler } from './healthcheck';

describe('healthcheck middleware tests', () => {

    it('ctx is setup correctly', async () => {

        let fnCalled = 0 ;
        function setFn(field: string, val: string) {
            expect(typeof (field) === 'string' && typeof (val) === 'string').toBeTrue();
            fnCalled++;
        }

        const ctx: Partial<Koa.Context> = {
            status: 0,
            body: '',
            // tslint:disable-next-line: no-any
            set: setFn as any
        };

        expect(ctx.body).not.toBeTruthy();

        await healthcheckHandler(ctx as Koa.Context);

        expect(fnCalled).toEqual(1);
        expect(ctx.status).toEqual(200);
        expect(ctx.body).toBeTruthy();
    });
});
