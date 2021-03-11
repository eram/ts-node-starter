
import { atTerminate, atTerminateCB, atRemove, makeExitHandler, makeErrorHandler } from "./atTermiate";


describe("atTermiate tests", () => {

  beforeAll(() => {
    // prevent timer from exitHandler from firering
    jest.useFakeTimers();
  });

  test("atRemove removes a callback", () => {
    const cb = jest.fn(() => { });
    const id = atTerminate(cb);
    expect(atRemove(id)).toBeTruthy();
    expect(atRemove(id)).toBeFalsy();
  });

  test("callbacks are called in exit handler in LIFO order", () => {

    const exit = jest.fn(_code => ({} as never));
    const mock = jest.spyOn(process, "exit").mockImplementation(exit);

    const cb1 = jest.fn(() => { });
    const id1 = atTerminate(cb1);

    const cb2 = jest.fn((cb: () => void) => { expect(cb1).toHaveBeenCalledTimes(0); cb(); });
    const id2 = atTerminateCB(cb2);

    const handler = makeExitHandler(0, "SIGINFO");
    handler();

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);

    atRemove(id2);
    atRemove(id1);
    mock.mockRestore();
  });

  test("makeErrorHandler calls exit", () => {
    const exit = jest.fn(_code => ({} as never));
    const mock = jest.spyOn(process, "exit").mockImplementation(exit);

    makeErrorHandler("test")(new Error("test"));

    expect(exit).toHaveBeenCalledTimes(1);
    mock.mockRestore();
  });

  test("error handler called on SIG", () => {

    const exit = jest.fn(_code => ({ } as never));
    const mock = jest.spyOn(process, "exit").mockImplementation(exit);

    const cb1 = jest.fn(() => { });
    const id1 = atTerminate(cb1);

    process.emit("SIGINT", "SIGINT");
    expect(exit).toHaveBeenCalled();

    atRemove(id1);
    mock.mockRestore();
  });

});
