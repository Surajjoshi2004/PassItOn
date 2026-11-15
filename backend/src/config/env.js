import dotenv from "dotenv";

dotenv.config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;
export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const GRADUATING_SOON_WINDOW_DAYS = Number(
  process.env.GRADUATING_SOON_WINDOW_DAYS || 90
);

export const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
export const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = Number(
  process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 15
);
export const RESEND_VERIFICATION_COOLDOWN_SECONDS = Number(
  process.env.RESEND_VERIFICATION_COOLDOWN_SECONDS || 60
);

export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_SECURE = process.env.SMTP_SECURE === "true";
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || "PassItOn <no-reply@passiton.local>";
