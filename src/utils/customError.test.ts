import { CustomError, errno } from ".";

export class ExampleError extends CustomError {
  public readonly isExample = true;
  constructor() {
    super("This is an example");
  }
}

export class SubExampleError extends ExampleError { /* no need for ctor */ }

describe("CustomError", () => {

  it("subclasses are instances of Error", () => {
    expect(new ExampleError()).toBeInstanceOf(Error);
    expect(new ExampleError()).toBeInstanceOf(ExampleError);
  });

  it("subclasses are instances of Error when thrown", () => {
    expect(() => {
      throw new ExampleError();
    }).toThrow();

    expect(() => {
      throw new ExampleError();
    }).toThrow(Error);

    expect(() => {
      throw new ExampleError();
    }).toThrow(ExampleError);
  });

  it("subclasses name property is the name of the class", () => {
    expect(new ExampleError().name).toEqual("ExampleError");
    expect(ExampleError.name).toEqual("ExampleError");
  });

  it("includes a stack trace", () => {
    expect(new ExampleError().stack).toBeDefined();
  });

  it("include itself in the stack trace", () => {
    const error = new ExampleError();
    expect(error.stack).toContain("ExampleError");
  });

  it("sub-subclasses are instances of Error when thrown", () => {
    expect(new SubExampleError()).toBeInstanceOf(Error);
    expect(() => {
      throw new SubExampleError();
    }).toThrow(Error);

    const error = new SubExampleError();
    expect(error).toBeInstanceOf(SubExampleError);
  });

  it("sub-subclasses are instances of themselves when thrown", () => {
    expect(new SubExampleError().name).toEqual("SubExampleError");

    expect(() => {
      throw new SubExampleError();
    }).toThrow(SubExampleError);

    expect(new SubExampleError()).toBeInstanceOf(ExampleError);

    expect(() => {
      throw new SubExampleError();
    }).toThrow(ExampleError);

    new SubExampleError();
    expect(SubExampleError.name).toEqual("SubExampleError");

    const error = new SubExampleError();
    expect(error.isExample).toBeDefined();
    expect(error.isExample).toBeTruthy();
  });

  it("sub-subclasses toString and JSNO.stringify", () => {
    const err1 = new ExampleError();
    expect(err1.toString()).toEqual("ExampleError: This is an example");
    const str1 = JSON.stringify(err1);
    expect(str1.includes("\"name\":\"ExampleError\"")).toBeTruthy();
    expect(str1.includes("\"message\":\"This is an example\"")).toBeTruthy();
    expect(str1.includes("\"stack\":\"ExampleError")).toBeTruthy();

    const err2 = new SubExampleError();
    expect(err2.toString()).toEqual("SubExampleError: This is an example");
    const str2 = JSON.stringify(err2);
    expect(str2.includes("\"name\":\"SubExampleError\"")).toBeTruthy();
    expect(str2.includes("\"message\":\"This is an example\"")).toBeTruthy();
    expect(str2.includes("\"stack\":\"SubExampleError")).toBeTruthy();
  });

  it("copy ctor", () => {
    class TestError extends CustomError { }
    const err = new Error("test");
    const testError = new TestError(err);
    expect(testError.toString()).toEqual("TestError: test");
    expect(testError.stack).toStrictEqual(err.stack);
  });

});

describe("errno", () => {

  test("ENOENT", () => {
    expect(errno.getStr(errno.ENOENT)).toEqual("ENOENT");
  });

  test("other", () => {
    expect(errno.getStr(5555)).toEqual("5555");
  });

});