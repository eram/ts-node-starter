import * as logger from './logger';

beforeAll(() => {
  process.env.LOG_ADD_TIME = 'true';
});

afterAll(() => {
  console.log('logger.test done');
});

describe('logger tests', () => {

  it('created', () => {
    const log = logger.getLogger('test', logger.LogLevel.trace);
    expect(log).not.toBeUndefined();
  });

  it('check all types of log levels', () => {
    logger.getLogger().setLevel(logger.LogLevel.debug);
    [logger.trace, logger.debug, logger.info, logger.warn, logger.error, logger.critical, logger.assert].forEach(fn => {
      expect(typeof fn).toBe('function');
      fn('check');
    });
  });

  it('check assertion throws in debug', () => {
    const save = process.env.DEBUG;
    process.env.DEBUG = 'true';
    expect(() => {
      logger.getLogger().assert(false);
    }).toThrow();
    delete process.env.DEBUG;
    expect(() => {
      logger.getLogger().assert(false);
    }).not.toThrow();
    process.env.DEBUG = save;
  });

  it('logs thru logger interface', () => {

    //let called = 0;
    const logFn = jasmine.createSpy('logFn', () => { /* */ });
    const log = logger.getLogger('logFn', logger.LogLevel.critical, logFn);
    log.critical('test');
    expect(logFn).toHaveBeenCalledTimes(1);
  });

});
