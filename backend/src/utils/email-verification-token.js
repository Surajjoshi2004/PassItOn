// import crypto from "crypto";
// import { EMAIL_VERIFICATION_TOKEN_TTL_MINUTES } from "../config/env.js";

// export const EMAIL_VERIFICATION_TOKEN_TTL_MS =
//   EMAIL_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000;

// export const generateVerificationToken = () => crypto.randomBytes(32).toString("hex");

// export const hashVerificationToken = (token) =>
//   crypto.createHash("sha256").update(token).digest("hex");

// export const getVerificationExpiry = () =>
//   new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

import crypto from "crypto"

import { EMAIL_VERIFICATION_TOKEN_TTL_MINUTES } from "../config/env.js"

export const EMAIL_VERIFICATION_TOKEN_TTL_MS = EMAIL_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000;

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
}

export const hashVerificationToken = (token)=>{
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const getVerificationExpiry = () => new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
