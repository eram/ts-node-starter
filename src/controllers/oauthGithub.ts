import * as Koa from "koa";
import axios from "axios";
import joiRouter from "koa-joi-router";
import { URL } from "url";
import { IDictionary, signToken, verifyToken } from "../utils";
import { requireAuthorization } from "../middleware/authorization";
import { User } from "../models";

const inProgress: IDictionary = {};

let authService: string;
let graphqlService: string;
let githubClientId: string;
let githubSecret: string;


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

  let res = await axios.get(url.href);
  let body = res?.data || {};
  const accessToken = body.access_token;

  if (!res || res.status !== 200 || !!body.error) {
    const msg = body.error_description || res?.statusText || res || "";
    throw new Error(`failed in fetching token. ${msg}`);
  }

  // get username
  res = await axios.post(graphqlService, {
    body: JSON.stringify({ query: "{viewer{login}}" }),
    headers: {
      Accept: "application/json",                 // eslint-disable-line
      Authorization: `bearer ${accessToken}`,     // eslint-disable-line
    },
  });

  // RESPONSE BODY LOOKS LIKE THIS...
  // {
  //   "data": {
  //     "viewer": {
  //       "sso": "eram",
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

  body = res?.data || {};
  const username = String(body?.data?.viewer?.login);
  if (!res || res.status !== 200 || !!body.errors || !username || username.length < 3) {
    throw new Error("failed in fetching user " + (res ? res.statusText : ""));
  }

  // make sure this user is not blocked
  const [user, created] = await User.findOrCreate({ where: { username } });
  if (!created && user.blocked) {
    throw new Error("user is blocked");
  }

  // add valid token
  const token = signToken({ user: username });
  const claims = verifyToken(token);
  user.validTokens.push(claims.iat);
  await user.save();
  return token;
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
    const token = await getToken(code);
    url.search = `?token=${encodeURIComponent(token)}`;
  } catch (err) {
    url.search = `?error=${encodeURIComponent(err.message || err)}`;
  }

  // redirect back to client page
  url.pathname = `${process.env.PUBLIC_URL}/sso`;
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

  // replace valid token
  user.validTokens = user.validTokens.map(iat => (iat === ctx.state.jwt?.iat) ? claims.iat : iat);
  user.isNewRecord = false;
  await user.save();

  ctx.body = { token };
  ctx.status = 200;
  ctx.type = "json";
}

async function revoke(ctx: Koa.Context, _next: Koa.Next) {

  // remove valid token
  const username = ctx.state.user;
  const user = await User.findOne({ where: { username } });
  user.isNewRecord = false;
  user.validTokens = user.validTokens.filter(iat => (iat !== ctx.state.jwt?.iat));
  await user.save();

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

  authService = opts.authService || "https://github.com/sso/github/oauth";
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
