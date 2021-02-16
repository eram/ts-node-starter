import * as Koa from "koa";
import axios from "axios";
import joiRouter from "koa-joi-router";
import { URL } from "url";
import { IDictionary, signToken, verifyToken } from "../utils";
import { requireAuthorization } from "../middleware/authorization";
import { User } from "../models";
import * as Cookies from "cookies";

const inProgress: IDictionary = {};

let authService: string;
let graphqlService: string;
let githubClientId: string;
let githubSecret: string;

const MAX_USER_TOKENS = Number(process.env.MAX_USER_TOKENS) || 10;

function authorize(ctx: Koa.Context) {
  // redirect to github oauth service
  // create a random token that is good for 10 mins
  const rand = (Math.round(Math.random() * 1000000)).toString();
  inProgress[rand] = ctx.get("Referrer") || ctx.href;
  setTimeout((n: string) => { delete inProgress[n]; }, (10 * 60 * 1000), rand).unref();

  const url = new URL(`${authService}/authorize`);
  url.searchParams.set("client_id", `${githubClientId}`);
  url.searchParams.set("scope", "user");
  url.searchParams.set("state", rand);
  url.searchParams.set("allow_signup", "false");
  ctx.redirect(url.href);
}


async function getToken(code: string) {

  const url = new URL(`${authService}/access_token`);
  url.searchParams.set("client_id", `${githubClientId}`);
  url.searchParams.set("client_secret", `${githubSecret}`);
  url.searchParams.set("code", `${code}`);

  let resp = await axios.get(url.href, {
    headers: { Accept: "application/json" },        // eslint-disable-line
  });
  const data = resp?.data;
  const accessToken = data.access_token;

  if (resp.status !== 200 || !!resp.data?.errors || !accessToken) {
    const msg = resp.statusText || resp.data?.errors || `status: ${resp.status}`;
    throw new Error(`failed in fetching token: ${msg}`);
  }

  // get username
  resp = await axios.post(graphqlService,
    JSON.stringify({ query: "{viewer{login}}" }),
    {
      headers: {
        Accept: "application/json",                 // eslint-disable-line
        Authorization: `bearer ${accessToken}`,     // eslint-disable-line
      },
    });

  // RESPONSE DATA LOOKS LIKE THIS...
  // {
  //   "data": {
  //     "viewer": {
  //       "login": "eram",
  //       "id": "MDQ6VXNlcjEwNDUzNzc="
  //     }
  //   }
  // }
  //
  // ERROR...
  // {
  //   "data": "null",
  //   "errors": [{
  //      message: "Log in to try..."
  //    }]
  // }

  const username = String(resp.data?.data?.viewer?.login || "");
  if (resp.status !== 200 || !!resp.data?.errors || !username || username.length < 3) {
    const msg = resp.statusText || resp.data?.errors[0]?.message || `status: ${resp.status}`;
    throw new Error(`failed in fetching user: ${msg}`);
  }

  // make sure this user is not blocked
  const [user, created] = await User.findOrCreate({ where: { username } });
  if (!created && user.blocked) {
    throw new Error("user is blocked");
  }

  // add valid token
  const token = signToken({ user: username });
  const claims = verifyToken(token);
  user.validTokens.unshift(claims.iat);
  while (user.validTokens.length > MAX_USER_TOKENS) {
    user.validTokens.pop();
  }
  user.isNewRecord = false;
  await user.save();
  return { token, claims };
}

async function login(ctx: Koa.Context, _next: Koa.Next): Promise<void> {

  const state = String(ctx?.query?.state);
  if (!state || !inProgress[state]) {
    // start a new process
    authorize(ctx);
    return;
  }

  // we're back from authorize
  const referrer = inProgress[state];
  delete inProgress[state];
  const url = new URL(referrer);
  const code = String(ctx.query.code);
  ctx.assert(!!code, 400, "missing code in request body");

  try {
    const { token, claims } = await getToken(code);

    // set cookie
    const opts: Cookies.SetOption = {
      expires: new Date(claims.exp * 1000),
      secure: (process.env.NODE_ENV === "production"),
      httpOnly: true,
      sameSite: "strict",
      overwrite: true,
    };
    ctx.cookies.set("token", token, opts);

    // this will inform frontend that we're logged-in
    url.searchParams.set("user", claims.user);
    url.searchParams.set("exp", claims.exp?.toString());

  } catch (err) {
    url.searchParams.set("error", err.message || JSON.stringify(err));
  }

  // redirect back to client page
  ctx.redirect(url.href);
}


async function refresh(ctx: Koa.Context, _next: Koa.Next) {

  const username = ctx.state.user;

  // make sure this user is not blocked
  const user = await User.findOne({ where: { username } });
  ctx.assert(!!user && !user.blocked, 401, "user is blocked");
  ctx.assert(!user.validTokens
    || user.validTokens.includes(ctx.state.jwt?.iat), 401, "user token revoked");

  const token = signToken({ user: username });
  const claims = verifyToken(token);

  // replace valid token in db and cleanup expired tokens
  user.validTokens = user.validTokens.map(iat => (iat === ctx.state.jwt?.iat) ? claims.iat : iat);
  user.isNewRecord = false;
  await user.save();

  // replace cookie
  const opts: Cookies.SetOption = {
    expires: new Date(claims.exp * 1000),
    secure: (process.env.NODE_ENV === "production"),
    httpOnly: true,
    sameSite: "strict",
    overwrite: true,
  };
  ctx.cookies.set("token", token, opts);

  // respond with the new token so it can be used to access other servers on the same cluster
  ctx.body = { token, user: username, expires: claims.exp * 1000 };
  ctx.status = 200;
  ctx.type = "json";
}

async function revoke(ctx: Koa.Context, _next: Koa.Next) {

  // remove valid token in db
  const username = ctx.state.user;
  const user = await User.findOne({ where: { username } });
  ctx.assert(!!user, 401, "invalid user");

  user.isNewRecord = false;
  user.validTokens = user.validTokens.filter(iat => (iat !== ctx.state.jwt?.iat));
  await user.save();

  ctx.cookies.set("token"); // expire this cookie now

  ctx.status = 200;
  ctx.set("Cache-Control", "no-cache");
  ctx.type = "json";
  ctx.body = {
    ok: true,
  };
}


export function init(router: joiRouter.Router, opts: {
  authService?: string;
  graphqlService?: string;
  githubClientId?: string;
  githubSecret?: string;
} = {}) {

  authService = opts.authService || "https://github.com/login/oauth";
  graphqlService = opts.graphqlService || "https://api.github.com/graphql";
  githubClientId = opts.githubClientId || process.env.OAUTH_GITHUB_CLIENT_ID;
  githubSecret = opts.githubSecret || process.env.OAUTH_GITHUB_SECRET;

  router.get("/sso/github/authorize",
    {
      pre: undefined,  // <<< auth here
      //handler: login,
      meta: {
        swagger: {
          summary: "Github oauth authorize",
          description: "Authenticate user with Github login",
          tags: ["sso"],
        },
      },
    }, login);

  router.get("/sso/github/refresh",
    {
      pre: requireAuthorization,  // <<< auth here
      //validate,
      meta: {
        swagger: {
          summary: "Github token refresh",
          description: "Get a new user token",
          tags: ["sso"],
        },
      },
    }, refresh);

  router.get("/sso/github/revoke",
    {
      pre: requireAuthorization,  // <<< auth here
      //validate,
      meta: {
        swagger: {
          summary: "Github oauth revoke",
          description: "Blacklist user token",
          tags: ["sso"],
        },
      },
    }, revoke);
}
