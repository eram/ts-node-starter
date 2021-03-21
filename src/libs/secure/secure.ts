/**
 * CORS whitelist
 * Content Security Policy - thru Helmet optios
 * Cookie policy - cookie options
 */

import cors from "@koa/cors";
import Cookies from "cookies";
import Koa from "koa";
import KoaHelmet from "koa-helmet";


export function cookieOptions(expires: number): Cookies.SetOption {
  const { PUBLIC_URL } = process.env;
  const domain = (new URL(PUBLIC_URL)).hostname;

  return {
    expires: new Date(expires),
    secure: (process.env.NODE_ENV === "production"),
    httpOnly: true,
    overwrite: true,
    path: "/",
    sameSite: "strict",     // change to "lax" if running on multiple subdomains
    domain,                 // remove if running on multiple sibdomains
  };
}


export function corsOptions(whitelist?: string[]): cors.Options {

  const { SEC_CORS_WHITELIST } = process.env;
  whitelist = whitelist || (SEC_CORS_WHITELIST ? JSON.parse(SEC_CORS_WHITELIST) : []);

  return {
    origin: (ctx: Koa.Context) => {
      const origin = ctx.request.get("origin");
      return whitelist.find(r => r === origin) || "";
    },
    credentials: true,
  };
}


type HelmetOptions = Required<Parameters<typeof KoaHelmet>>[0];
type CspOpts = KoaHelmet.KoaHelmetContentSecurityPolicyDirectives;

export function helmetOptions(opts?: CspOpts): HelmetOptions {
  type CspOptions = HelmetOptions["contentSecurityPolicy"];
  type CspDirectives = Exclude<CspOptions, false>["directives"];
  const { SEC_CSP_OPS } = process.env;
  opts = opts || (SEC_CSP_OPS ? JSON.parse(SEC_CSP_OPS) : undefined);

  return {
    referrerPolicy: { policy: "same-origin" },
    contentSecurityPolicy: opts ? { directives: opts as CspDirectives } : false, // dangerouslyDisableDefaultSrc,
  };
}
