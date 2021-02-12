import { ArrayAsync, sleep } from "./asyncs";

describe("ArrayAsync", () => {

  test("ArrayAsync.asyncForEach", async () => {

    const start = Date.now();
    const arr = new ArrayAsync(1, 2);

    const fn = jest.fn(async (_item) => {
      await sleep(50);
    });

    // sleep in a row: 2*50 >= 100
    await arr.asyncForEach(fn);

    expect(Date.now() - start).toBeGreaterThanOrEqual(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("ArrayAsync.asyncForAll", async () => {

    const start = Date.now();
    const arr = new ArrayAsync(1, 2);

    const fn = jest.fn(async (_item) => {
      await sleep(50);
    });

    // sleep in parallel: >= 50
    await arr.asyncForAll(fn);

    expect(Date.now() - start).toBeGreaterThanOrEqual(50);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

