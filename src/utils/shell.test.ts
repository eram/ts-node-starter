import readline from "readline";
import { errno } from "./customError";
import { system, prompt } from "./shell";

describe("shell testing", () => {

  test("system positive", async () => {
    const code = await system("node -e \"console.log(process.pid)\"", true);
    expect(code).toEqual(0);
  });

  test("system negative", async () => {
    const code = await system("test1234");
    expect(code).toEqual(errno.EPERM);
  });

  test("system negative throw", async () => {
    await expect(system("test1234", true)).rejects.toThrow(/EPERM/);
  });

  test("prompt positive", async () => {
    const mock1 = jest.spyOn(readline, "createInterface").mockReturnValue({
      question: jest.fn().mockImplementation((_q, cb) => cb("test")),
      close: jest.fn().mockImplementation(() => undefined),
      on: jest.fn().mockImplementation(() => undefined),
    } as never);

    const yn = await prompt("?", "y");
    expect(yn).toEqual("test");
    expect(mock1).toHaveBeenCalled();
    mock1.mockRestore();
  });

  test("prompt with def value", async () => {
    const mock1 = jest.spyOn(readline, "createInterface").mockReturnValue({
      question: jest.fn().mockImplementation((_q, cb) => cb("")),
      close: jest.fn().mockImplementation(() => undefined),
      on: jest.fn().mockImplementation(() => undefined),
    } as never);

    const yn = await prompt("?", "y");
    expect(yn).toEqual("y");
    expect(mock1).toHaveBeenCalled();
    mock1.mockRestore();
  });
});
