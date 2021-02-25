import * as logger from "./logger";

beforeAll(() => {
  process.env.LOG_ADD_TIME = "true";
  logger.hookConsole();
});

afterAll(() => {
  logger.unhookConsole();
});

describe("logger tests", () => {

  it("created", () => {
    const nullFn = (_level: logger.LogLevel, _txt: string) => { };
    const log = logger.getLogger("test1", logger.LogLevel.trace, nullFn);
    expect(log).not.toBeUndefined();
  });

  it("logs thru logger function", () => {
    const nullFn = jest.fn((_level: logger.LogLevel, _txt: string) => { });
    const log = logger.getLogger("test2", logger.LogLevel.critical, nullFn);
    log.critical("test");
    expect(nullFn).toHaveBeenCalledTimes(1);
  });

  it("logs thru global logger", () => {
    logger.warn("logs thru global logger");
  });

  it("check all types of log levels", () => {
    const nullFn = jest.fn((_level: logger.LogLevel, _txt: string) => { });
    const log = logger.getLogger("test3", logger.LogLevel.debug, nullFn);
    log.debug(1);
    log.trace(2);
    log.info(3);
    log.warn(4);
    log.error(5);
    log.critical(6);
    expect(nullFn).toHaveBeenCalledTimes(6);
  });

  it("check level works", () => {
    const nullFn = jest.fn((_level: logger.LogLevel, _txt: string) => { });
    const log = logger.getLogger("test4", logger.LogLevel.warn, nullFn);
    log.debug(0);
    log.trace(0);
    log.info(0);
    log.warn(1);
    log.error(2);
    log.critical(3);
    expect(nullFn).toHaveBeenCalledTimes(3);
  });

  it("check assertion throws in debug", () => {
    const nullFn = (_level: logger.LogLevel, _txt: string) => { };
    const save = process.env.JEST_WORKER_ID;
    delete process.env.LOG_ADD_TIME;
    logger.assert(!!save);

    const log = logger.getLogger("test5", logger.LogLevel.warn, nullFn);
    expect(() => {
      log.assert(false);
    }).toThrow();

    delete process.env.JEST_WORKER_ID;
    const log2 = logger.getLogger("test6", logger.LogLevel.warn, nullFn);
    expect(() => {
      log2.assert(false, "should throw");
    }).toThrow();

    process.env.JEST_WORKER_ID = save;
  });
});
