/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IDictionary<T = string> { [key: string]: T }
export type Immutable<T> = { readonly [P in keyof T]: T[P] };

//
// plain old javascript object >> JSON extention
//
export interface POJO extends IDictionary<any> {                      // eslint-disable-line
  stringify?: (value: any, replacer?: (this: any, key: string, value: any) => any, space?: number | string) => string;
  parse?: (text: string, reviver?: (this: any, key: string, value: any) => any) => POJO;
}

function toPOJO(text: string | unknown, reviver?: (this: any, key: string, value: any) => any) {
  const obj = (typeof text === "string") ? JSON.parse(text, reviver) : JSON.parse(JSON.stringify(text));
  return obj as POJO;
}

export const POJO: (POJO & typeof toPOJO) = toPOJO;                   // eslint-disable-line
POJO.stringify = JSON.stringify;
POJO.parse = toPOJO;

//
// readonly old javascript object
//
export interface ROJO extends Readonly<IDictionary<Readonly<any>>> {  // eslint-disable-line
  [key: string]: any;
  stringify?: (value: any, replacer?: (this: any, key: string, value: any) => any, space?: number | string) => string;
  parse?: (text: string, reviver?: (this: any, key: string, value: any) => any) => ROJO;
}

function toROJO(text: string | unknown, reviver?: (this: any, key: string, value: any) => any) {
  const obj = toPOJO(text, reviver);
  // TODO: deep-freeze
  return Object.freeze(obj) as ROJO;
}

export const ROJO: (Readonly<ROJO> & typeof toROJO) = toROJO;         // eslint-disable-line
Object(ROJO).stringify = JSON.stringify;
Object(ROJO).parse = toROJO;
