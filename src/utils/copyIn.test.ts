import { copyIn, merge } from "./copyIn";

test("copyIn throws on iteratable", () => {

  const source1 = new Set(["test", 1]);
  const source2 = new Set(["test2", 5]);
  expect(() => { copyIn(source1, source2); }).toThrow();
});

class C {
  constructor(public one: number, public two?: number) { }
}

test("copyIn on a class", () => {

  const source1 = new C(1);
  const proto1 = Object.getPrototypeOf(source1); // C

  const source2 = { two: 2 };
  const out2 = copyIn(source1, source2);

  expect(Object.getPrototypeOf(out2)).toEqual(proto1);
  expect(source1.two).toEqual(2);
  expect(out2.one).toEqual(1);
});

test("merge", () => {

  const source1 = new C(1);
  const proto1 = Object.getPrototypeOf(source1); // C

  const source2 = { test: 2 };
  const out2 = merge(source1, source2);

  expect(Object.getPrototypeOf(out2)).toEqual(proto1);
  expect(out2.one).toEqual(1);
  expect(out2.test).toEqual(2);
});
