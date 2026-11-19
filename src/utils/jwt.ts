import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { JwtPayloadData } from "../types/index.js";

export const signAccessToken = (payload: JwtPayloadData): string => {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
};

export const verifyAccessToken = (token: string): JwtPayloadData => {
  return jwt.verify(token, env.jwtSecret) as JwtPayloadData;
};