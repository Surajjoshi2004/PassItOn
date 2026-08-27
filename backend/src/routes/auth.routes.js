import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", loginUser);

export default router;
