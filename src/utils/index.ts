export * from './fs';
export * from './logger';
export * from './config';
export * from './processOn';

// tslint:disable-next-line: no-any
export interface IndexSig { [key: string]: any; }
export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
