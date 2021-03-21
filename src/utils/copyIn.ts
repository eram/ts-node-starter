import { assert } from "./logger";

// copyIn() is is much like Object.assign() but used for copying options passed into a contructor
export function copyIn<T extends Object>(_this: T, source: Readonly<Partial<T>>, skipKeys: string[] = []) {
  if (_this && source) {
    assert(!(Symbol.iterator in Object(source)), "copyIn not suitable for iterators");

    Object.keys(source).forEach((key) => {
      if (!skipKeys.includes(key)) {
        Object(_this)[key] = Object(source)[key];
      }
    });
    // todo: recursive objects, iterators etc.
  }
  return _this;
}


// merge() is much like Object.assign() but it keeps the prototype chain and merges the types as well
export function merge<T1 extends Object, T2 extends Object>(src1: T1 | Readonly<T1>, src2: T2 | Readonly<T2>) {

  const dest = {};
  copyIn(dest as T1, src1);
  copyIn(dest as T2, src2);

  if (Object.getPrototypeOf(src2) !== Object.getPrototypeOf(dest)) {
    Object.setPrototypeOf(dest, Object.getPrototypeOf(src2));
  } else if (Object.getPrototypeOf(src1) !== Object.getPrototypeOf(dest)) {
    Object.setPrototypeOf(dest, Object.getPrototypeOf(src1));
  }

  return dest as T1 & T2;
}
