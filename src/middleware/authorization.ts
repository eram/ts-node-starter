
import { Context, Next } from "koa";
import { User } from "../models";
import { signToken, verifyToken } from "../utils";
import * as Cookies from "cookies";

const MAX_USER_TOKENS = Number(process.env.MAX_USER_TOKENS) || 10;
const USER_IS_BLCOKED = "user is blocked";

// we use a cache of users to minimize calls to db
const userCache = (() => {

  const USER_CACHE_TIMEOUT = Number(process.env.USER_CACHE_TIMEOUT) || 30000;
  type UC = [username: string, iat: number];
  const uc2k = (k: UC) => `${k[0]}-${k[1]}`;
  const ucMap = new Map<string, number>();

  return {
    get: (key: UC) => {
      const k = uc2k(key);
      let exp = ucMap.get(k);
      if (!!exp && exp < Date.now()) {
        ucMap.delete(k);
        exp = undefined;
      }
      return exp;
    },
    has: (key: UC) => !!ucMap.get(uc2k(key)),
    set: (key: UC) => ucMap.set(uc2k(key), Date.now() + USER_CACHE_TIMEOUT),
    delete: (key: UC) => ucMap.delete(uc2k(key)),
  };
})();


function getClaims(ctx: Context) {

  if (!!ctx.state.jwt) return;
  try {
    let token = ctx.request.get("Authorization");
    if (token)
      token = token.replace("Bearer ", "");
    else {
      token = ctx.cookies.get("token");
    }

    if (!token) return;

    const jwt = verifyToken(token);
    if (jwt) {
      ctx.state.jwt = jwt;
      ctx.state.user = jwt.user;
    }
  } catch (e) {
    console.error("getClaims:", e);
  }
}


export async function parseToken(ctx: Context, next: Next) {
  getClaims(ctx);
  return next();
}


export async function requireAuthorization(ctx: Context, next: Next) {
  getClaims(ctx);

  // must have a user that is not blocked or token not in rejects
  ctx.assert(!!ctx.state.user && !!ctx.state.jwt && !!ctx.state.jwt.iat, 401, "authorization required");

  if (!userCache.has([ctx.state.user, ctx.state.jwt.iat])) {
    const user = await User.findOne({ where: { username: ctx.state.user } });

    if (!user) { // we have some invalid jwt/cookie
      ctx.cookies.set("token"); // expire this cookie now
    }
    ctx.assert(!!user, 401, "invalid user");
    ctx.assert(!user.blocked, 401, USER_IS_BLCOKED);
    ctx.assert(!user.validTokens
      || user.validTokens.includes(ctx.state.jwt.iat), 401, "user token revoked");

    userCache.set([ctx.state.user, ctx.state.jwt.iat]);
  }

  return next();
}


export async function afterLogin(ctx: Context, username: string) {

  // make sure this user is not blocked
  const [user, created] = await User.findOrCreate({ where: { username } });
  ctx.assert(created || !user.blocked, 401, USER_IS_BLCOKED);

  // add valid token
  const token = signToken({ user: username });
  const claims = verifyToken(token);
  user.validTokens.unshift(claims.iat);
  while (user.validTokens.length > MAX_USER_TOKENS) {
    user.validTokens.pop();
  }
  user.isNewRecord = false;
  await user.save();

  userCache.set([username, claims.iat]);

  // cookie is used for further auth by the same client
  const opts: Cookies.SetOption = {
    expires: new Date(claims.exp * 1000),
    secure: (process.env.NODE_ENV === "production"),
    httpOnly: true,
    sameSite: "strict",
    overwrite: true,
  };
  ctx.cookies.set("token", token, opts);

  return claims;
}


export async function refresh(ctx: Context) {

  // NOTE! requireAuthorization should have been called on this context
  const username = ctx.state.user;
  const token = signToken({ user: username });
  const claims = verifyToken(token);

  // replace valid token in db and cleanup expired tokens
  const user = await User.findOne({ where: { username } });
  user.validTokens = user.validTokens.map(iat => (iat === ctx.state.jwt.iat) ? claims.iat : iat);
  user.isNewRecord = false;
  await user.save();

  userCache.delete([username, ctx.state.jwt.iat]);
  userCache.set([username, claims.iat]);

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


export async function revoke(ctx: Context) {

  // NOTE! requireAuthorization should have been called on this context
  const username = ctx.state.user;
  const user = await User.findOne({ where: { username } });
  user.isNewRecord = false;
  user.validTokens = user.validTokens.filter(iat => (iat !== ctx.state.jwt?.iat));
  await user.save();

  userCache.delete([username, ctx.state.jwt.iat]);
  ctx.cookies.set("token"); // expire this cookie now

  ctx.status = 200;
  ctx.set("Cache-Control", "no-cache");
  ctx.type = "json";
  ctx.body = {
    ok: true,
  };
}
