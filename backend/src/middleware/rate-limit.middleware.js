import { RESEND_VERIFICATION_COOLDOWN_SECONDS } from "../config/env.js";
import { normalizeEmail } from "../utils/email.js";

export const createRateLimiter = ({
  windowMs,
  max = 1,
  keyGenerator,
  message = "Too many requests. Please try again later.",
}) => {
  const hits = new Map();

  const middleware = (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req) || "unknown";
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      cleanup(hits, now);
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message,
        retryAfter,
      });
    }

    entry.count += 1;
    return next();
  };

  middleware.reset = () => hits.clear();

  return middleware;
};

const cleanup = (hits, now) => {
  if (hits.size < 1000) return;
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
};

export const resendVerificationLimiter = createRateLimiter({
  windowMs: RESEND_VERIFICATION_COOLDOWN_SECONDS * 1000,
  max: 1,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown-ip";
    return `${ip}:${normalizeEmail(req.body?.email)}`;
  },
  message: "Too many verification emails requested. Please wait before trying again.",
});
