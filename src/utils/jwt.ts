import { verify, sign } from "jsonwebtoken";
import { IDictionary, POJO } from "./pojo";


export class Claims implements IDictionary<boolean | number | string> {
  [key: string]: boolean | number | string;
  readonly error?: string;
  readonly user?: string;
  readonly exp?: number;  // expired at
  readonly iat?: number;  // issued at
}

export function signToken(claims: Claims, expiresIn = "7d") {
  const pojo = POJO(claims);
  return sign(pojo, String(process.env.JWT_SECRET || ""), { expiresIn });
}

export function verifyToken(token: string, secret?: string): Claims {
  try {
    const claims = verify(token, secret || process.env.JWT_SECRET || "");
    return claims as Claims;
  } catch (err) {
    // try again with old secret
    if (err.message === "invalid signature" && !secret){
      return verifyToken(token, process.env.JWT_SECRET_OLD);
    }
    return { error: err.message };
  }
}
