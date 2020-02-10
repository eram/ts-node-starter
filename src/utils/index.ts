export * from './fs';
export * from './logger';
export * from './config';
export * from './processOn';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/interface-name-prefix
export interface IndexSig {[key: string]: any}
export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
