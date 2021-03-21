import { POJO, ROJO } from "./pojo";

describe("pojo tests", () => {
  test("types", () => {

    // type
    const p1: POJO = {};
    expect(p1).toEqual({});

    // function
    const p2 = POJO("[]");
    expect(p2).toBeInstanceOf(Object);
    expect(p2).toBeInstanceOf(Array);
    expect(p2).not.toBeInstanceOf(Map);

    // function namesapce
    const p3 = POJO.stringify({});
    expect(p3).toEqual("{}");
  });


  test("pojo from class", () => {
    class C extends Map<string, string> { hello = 0; }
    const c = new C();

    const before = Object.getPrototypeOf(c);
    expect(before.constructor.name).toEqual("C");
    expect(c.hello).toEqual(0);
    expect(typeof c.size).toEqual("number");

    const pojo = POJO(c);
    const after = Object.getPrototypeOf(pojo);
    expect(after.constructor.name).toEqual("Object");
    expect(pojo.hello).toEqual(0);
    expect(typeof pojo.size).toEqual("undefined");
  });

  test("pojo stringify", () => {
    const pojo = POJO("{ \"hello\": 0 }");
    const after = Object.getPrototypeOf(pojo);
    expect(after.constructor.name).toEqual("Object");
    expect(pojo.hello).toEqual(0);

    const str = JSON.stringify(pojo, undefined, 1);
    expect(str).toEqual("{\n \"hello\": 0\n}");
  });

  test("pojo stringify with bigint", () => {
    const pojo = { hello: -20n };

    const str = POJO.stringify(pojo, undefined, 1);
    expect(str).toEqual("{\n \"hello\": \"-20n\"\n}");

    const parsed = POJO.parse(str);
    expect(typeof parsed).toEqual("object");
    expect(typeof parsed.hello).toEqual("bigint");
    expect(parsed.hello).toStrictEqual(-20n);
  });
});

describe("rojo tests", () => {
  test("types", () => {

    // type
    const p1: ROJO = {};
    expect(p1).toEqual({});

    // function
    const p2 = ROJO("[]");
    expect(p2).toBeInstanceOf(Object);
    expect(p2).toBeInstanceOf(Array);
    expect(p2).not.toBeInstanceOf(Map);

    // function namesapce
    const p3 = ROJO.stringify({});
    expect(p3).toEqual("{}");
  });

  test("rojo is frozen", () => {

    const p2 = ROJO("[]");
    // @ts-expect-error
    expect(() => { p2.a = 1; }).toThrow();
  });
});
