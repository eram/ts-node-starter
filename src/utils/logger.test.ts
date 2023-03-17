import * as logger from "./logger";
import { POJO } from "./pojo";

beforeAll(() => {
  logger.hookConsole();
});

afterAll(() => {
  logger.unhookConsole();
});

function getMockConsole(nullFn: Function) {
  return {
    ...console,
    debug: nullFn,
    trace: nullFn,
    info: nullFn,
    warn: nullFn,
    error: nullFn,
    critical: nullFn,
  } as logger.Logger;
}

describe("logger tests", () => {

  it("created only once for the same name", () => {
    const log1 = logger.createLogger("test1", logger.LogLevel.trace);
    expect(log1).not.toBeUndefined();
    expect(typeof log1.critical).toEqual("function");
    Object(log1).marker = process.env.JEST_WORKER_ID;

    const log2 = logger.createLogger("test1", logger.LogLevel.trace);
    expect(log1).toEqual(log2);
    expect(Object(log1).marker).toEqual(Object(log2).marker);
  });

  it("logs thru logger function", () => {
    const nullFn = jest.fn(() => { });
    const log = logger.createLogger("test2", logger.LogLevel.error, getMockConsole(nullFn));
    log.warn("no log");
    log.error("test error");
    expect(nullFn).toHaveBeenCalledTimes(1);
  });

  it("logs with formatting", () => {
    const nullFn = jest.fn((str) => {
      expect(str).toContain("foo:bar");
    });
    const log = logger.createLogger("testFormatting", logger.LogLevel.error, getMockConsole(nullFn));
    log.error("%s:%s", "foo", "bar");
    expect(nullFn).toHaveBeenCalledTimes(1);
  });

  it("critical always logged thru error function", () => {
    const nullFn = jest.fn(() => { });
    const log = logger.createLogger("testCritical", logger.LogLevel.critical, getMockConsole(nullFn));
    log.critical("test critical");
    expect(nullFn).toHaveBeenCalledTimes(1);
  });

  it("logs thru global logger", () => {
    logger.error("%s:%s", "foo", "bar");
  });

  it("json logger with params", () => {
    const nullFn = jest.fn((obj: POJO) => {
      expect(typeof obj).toBe("object");
      expect(typeof obj.message).toEqual("string");
      expect(obj.message).toEqual("foo:bar");
      expect(obj.ctx).toEqual("testJson");
    });
    process.env.LOG_FORMAT = "json";
    const log = logger.createLogger("testJson", logger.LogLevel.info, getMockConsole(nullFn));
    delete process.env.LOG_FORMAT;
    log.log("%s:%s", "foo", "bar");
    expect(nullFn).toHaveBeenCalledTimes(1);

  });

  it("log with time", () => {
    const nullFn = jest.spyOn(console, "info").mockImplementation((str: string) => {
      expect(str.match(/\d{1,2}T\d{1,2}:\d{1,2}:\d{1,2}\.\d{1,3}Z/)).toBeTruthy();
    });
    process.env.LOG_ADD_TIME = "true";
    const log = logger.createLogger("withTime", logger.LogLevel.info, console);
    delete process.env.LOG_ADD_TIME;
    log.info("logs with time");
    expect(nullFn).toHaveBeenCalledTimes(1);
  });

  it("check all types of log levels", () => {
    const nullFn = jest.fn((_level: logger.LogLevel, _txt: string) => { });
    const log = logger.createLogger("test3", logger.LogLevel.debug, getMockConsole(nullFn));
    log.debug(1);
    log.trace(2);
    log.info(3);
    log.warn(4);
    log.error(5);
    log.critical(6);
    expect(nullFn).toHaveBeenCalledTimes(6);
  });

  it("check log only above log level", () => {
    const nullFn = jest.fn((_level: logger.LogLevel, _txt: string) => { });
    const log = logger.createLogger("test4", logger.LogLevel.warn, getMockConsole(nullFn));
    log.debug(0);
    log.trace(0);
    log.info(0);
    log.warn(1);
    log.error(2);
    log.critical(3);
    expect(nullFn).toHaveBeenCalledTimes(3);
  });

  it("check assertion failed throws", () => {
    const log = logger.createLogger("test5", logger.LogLevel.warn);
    expect(() => {
      log.assert(0, "test");
    }).toThrow(/test/);
  });

  expect(() => {
    logger.assert(0, "test");
  }).toThrow();
});
