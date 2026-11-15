import { Router } from "express";
import {
  authenticate,
  requireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import {
  createReportHandler,
  listMyReportsHandler,
} from "../controllers/report.controller.js";

const router = Router();

router.post("/", authenticate, requireVerifiedEmail, createReportHandler);
router.get("/me", authenticate, requireVerifiedEmail, listMyReportsHandler);

export default router;
