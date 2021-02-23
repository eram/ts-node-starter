import * as Koa from "koa";
import axios from "axios";
import joiRouter from "koa-joi-router";
import { URL } from "url";
import { copyIn } from "../utils";
import { afterLogin, refresh, requireAuthorization, revoke } from "../middleware/authorization";
import { KV } from "../models/kv.model";

const keyfn = (n: string) => `github-${n}`;

const github = {
  authService: "https://github.com/login/oauth",
  graphqlService: "https://api.github.com/graphql",
  clientId: String(process.env.OAUTH_GITHUB_CLIENT_ID),
  secret: String(process.env.OAUTH_GITHUB_SECRET),
};


async function authorize(ctx: Koa.Context) {
  // redirect to github oauth service
  // create a random token that is good for 10 mins
  const rand = (Math.round(Math.random() * 1000000)).toString();
  await KV.create({
    key: keyfn(rand),
    val:  ctx.get("Referrer") || ctx.href,
    exp: new Date(Date.now() + (10 * 60 * 1000)),
  });

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
    headers: { Accept: "application/json" },        // eslint-disable-line
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

  return username;
}


async function login(ctx: Koa.Context, _next: Koa.Next): Promise<void> {

  const state = String(ctx?.query?.state || "");
  let referrer = "";

  if (state) {
    const kv = await KV.findOne({ where: { key: keyfn(state) } });
    if (kv) {
      referrer = kv.isValid ? kv.val : "";
      void kv.destroy();
    }
  }

  if (!referrer) {
    // start a new process
    return authorize(ctx);
  }

  // we're back from authorize
  const url = new URL(referrer);
  const code = String(ctx.query.code || "");
  ctx.assert(!!code, 400, "missing code in request body");

  try {
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


export function init(router: joiRouter.Router, opts: Partial<typeof github> = {}) {

  copyIn(github, opts);

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
