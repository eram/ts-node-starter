import * as Koa from "koa";
import axios from "axios";
import joiRouter from "koa-joi-router";
import { URL } from "url";
import { copyIn } from "../utils";
import { afterLogin, refresh, requireAuthorization, revoke } from "../middleware/authorization";
import { KVStore } from "../models/kv.model";


const github = {
  authService: "https://github.com/login/oauth",
  graphqlService: "https://api.github.com/graphql",
  clientId: String(process.env.OAUTH_GITHUB_CLIENT_ID),
  secret: String(process.env.OAUTH_GITHUB_SECRET),
};

let kv: KVStore;  // name: "github-state",

async function authorize(ctx: Koa.Context2) {
  const referrer = ctx.get("Referrer");
  ctx.assert(referrer, 401, "Referrer header must be supplied on this call");

  // redirect to github oauth service
  // create a random token that is good for 10 mins
  const rand = (Math.round(Math.random() * 1000000)).toString();
  await kv.set(rand, referrer);

  const url = new URL(`${github.authService}/authorize`);
  url.searchParams.set("client_id", github.clientId);
  url.searchParams.set("scope", "user");
  url.searchParams.set("state", rand);
  url.searchParams.set("allow_signup", "false");
  ctx.redirect(url.href);
}


async function getToken(code: string) {

  const url = new URL(`${github.authService}/access_token`);
  url.searchParams.set("client_id", github.clientId);
  url.searchParams.set("client_secret", github.secret);
  url.searchParams.set("code", code);

  let resp = await axios.get(url.href, {
    headers: { accept: "application/json" },
  });
  const accessToken = resp.data?.access_token;

  if (resp.status !== 200 || !!resp.data?.errors || !accessToken) {
    const msg = resp.statusText || resp.data?.errors || `status: ${resp.status}`;
    throw new Error(`failed in fetching token: ${msg}`);
  }

  // get username
  resp = await axios.post(github.graphqlService,
    JSON.stringify({ query: "{viewer{login}}" }),
    {
      headers: {
        accept: "application/json",
        authorization: `bearer ${accessToken}`,
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

  return username;
}


async function login(ctx: Koa.Context2, _next: Koa.Next): Promise<void> {

  const state = String(ctx?.query?.state || "");
  let referrer = "";

  if (state) {
    referrer = await kv.get(state);
  }

  if (!referrer) {
    // start a new process
    await authorize(ctx);
    return;
  }

  // we're back from authorize
  const url = new URL(referrer);
  try {
    if (ctx.query.error) {
      throw new Error(String(ctx.query.error_description || ctx.query.error || "Failed"));
    }

    const code = String(ctx.query.code || "");
    ctx.assert(!!code || (ctx.query.user && ctx.query.exp), 400, "invalid request");

    const username = await getToken(code);
    const claims = await afterLogin(ctx, username);

    // this will inform frontend that we're logged-in
    url.searchParams.set("user", claims.user);
    url.searchParams.set("exp", claims.exp?.toString());

  } catch (err) {
    url.searchParams.set("error", err.message || JSON.stringify(err));
  }

  // redirect back to client page
  ctx.redirect(url.href);
}


export function init(router: joiRouter.Router, opts: Readonly<Partial<typeof github>> = {}) {

  copyIn(github, opts);
  kv = new KVStore({ name: "github-state", timeout: 10 * 60 * 1000 });

  router.get("/sso/github/authorize",
    {
      pre: undefined, // <<< auth here
      // handler: login,
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
      pre: requireAuthorization, // <<< auth here
      // validate,
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
      pre: requireAuthorization, // <<< auth here
      // validate,
      meta: {
        swagger: {
          summary: "Github oauth revoke",
          description: "Blacklist user token",
          tags: ["sso"],
        },
      },
    }, revoke);
}
