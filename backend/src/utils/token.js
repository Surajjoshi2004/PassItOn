import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env.js";

export const generateAuthToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};
