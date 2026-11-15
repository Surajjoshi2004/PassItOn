import { Router } from "express";
import {
  authenticate,
  requireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import { getMe, updateMe } from "../controllers/user.controller.js";

const router = Router();

router.use(authenticate, requireVerifiedEmail);

router.get("/me", getMe);
router.patch("/me", updateMe);

export default router;
