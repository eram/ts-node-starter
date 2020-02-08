
import 'jasmine';
import * as logger from './logger';

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

});
