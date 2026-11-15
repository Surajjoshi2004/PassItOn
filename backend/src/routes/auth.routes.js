import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
} from "../controllers/auth.controller.js";
import { resendVerificationLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationLimiter, resendVerification);
router.post("/login", loginUser);

export default router;
