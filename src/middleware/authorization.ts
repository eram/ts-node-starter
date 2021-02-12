
import { Context, Next } from "koa";
import { User } from "../models";
import { verifyToken } from "../utils";


function getClaims(ctx: Context) {

  if (!!ctx.state.jwt) return;

  try {
    let token = ctx.request.get("Authorization");
    if (token)
      token = token.replace("Bearer ", "");
    const jwt = verifyToken(token);
    if (jwt) {
      ctx.state.jwt = jwt;
      ctx.state.user = jwt.user;
    }
  } catch (e) {
    console.error(e);
  }
}


export async function parseToken(ctx: Context, next: Next) {
  getClaims(ctx);
  return next();
}


export async function requireAuthorization(ctx: Context, next: Next) {
  getClaims(ctx);

  // must have a user that is not blocked or token not in rejects
  ctx.assert(ctx.state.user, 401, "authorization required");

  const user = await User.findOne({ where: { username: ctx.state.user } });
  ctx.assert(!user.blocked, 401, "user is blocked");

  ctx.assert(!user.validTokens
    || user.validTokens.includes(ctx.state.jwt?.iat), 401, "user token revoked");

  return next();
}
