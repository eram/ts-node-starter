/* istanbul ignore file */
/* eslint-disable */

export const getToken = (name: string) => `token:${name}`;
console.info(getToken("hi"));
