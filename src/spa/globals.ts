export const url = new URL(document.location.href);
export const basename = url.pathname.split(/.*[/|\\]/)[1];
export const debug = document.location.hostname === "localhost" || document.location.search.indexOf("debug=true") > 0;
export const info = debug ? console.info.bind(console, "[SPA]") : () => { };
export const error = console.error.bind(console, "[SPA]");
export const BASE_PATH = "app";
export const TEMPLATES_PATH = `/${BASE_PATH}/pages`;
