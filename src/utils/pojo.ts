
/* es lint-disable @typescript-eslint/no-explicit-any */
export interface IDictionary<T = string> { [key: string]: T }
export type Immutable<T> = { readonly [P in keyof T]: T[P] };

// like JSON.stringify but adds suppport for bigint
function stringify(
  value: unknown,
  replacer?: (this: unknown, key: string, value: unknown) => unknown,
  space?: number | string) {
  return JSON.stringify(value, replacer
    || ((_key: string, val: unknown) => (typeof val === "bigint" ? `${val.toString()}n` : val)), space);
}

// like JSON.parse but adds support for bigint
function parse(text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
  return JSON.parse(text, reviver
    || ((_key: string, val: unknown) => ((typeof val === "string" && val.match(/^[+,-]?\d*n$/))
      ? BigInt(val.substr(0, val.length - 1)) : val)));
}

function toPOJO(text: string | unknown, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
  const obj = (typeof text === "string") ? parse(text, reviver) : parse(stringify(text));
  return obj as POJO;
}

function toROJO(text: string | unknown, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
  // TODO: deep-freeze
  return Object.freeze(toPOJO(text, reviver));
}


//
// POJO (plain old javascript object) >> JSON extention
//
export interface POJO extends IDictionary<any> {                       // eslint-disable-line
  stringify?: typeof stringify;
  parse?: typeof toPOJO;
}

export const POJO: (POJO & typeof toPOJO) = toPOJO;                   // eslint-disable-line
POJO.stringify = stringify;
POJO.parse = toPOJO;

//
// ROJO: readonly POJO
//
export interface ROJO extends Readonly<IDictionary<Readonly<any>>> {  // eslint-disable-line
  [key: string]: any;                                                 // eslint-disable-line
  stringify?: typeof stringify;
  parse?: typeof toROJO;
}

export const ROJO: (ROJO & typeof toROJO) = toROJO;                   // eslint-disable-line
ROJO.stringify = stringify;
ROJO.parse = toROJO;
