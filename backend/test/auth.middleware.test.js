import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/config/env.js";
import { authenticate } from "../src/middleware/auth.middleware.js";

const invoke = (authorization) => {
  const req = { headers: authorization ? { authorization } : {} };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  let nextCalled = false;
  authenticate(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
};

test("rejects protected requests without a bearer token", () => {
  const { res, nextCalled } = invoke();
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("rejects protected requests with an invalid token", () => {
  const { res, nextCalled } = invoke("Bearer not-a-token");
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("authenticates a valid token and attaches the user", () => {
  const token = jwt.sign(
    { sub: "user-1", role: "student", isEmailVerified: true },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
  const { req, nextCalled } = invoke(`Bearer ${token}`);
  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, {
    id: "user-1",
    role: "student",
    isEmailVerified: true,
  });
});
