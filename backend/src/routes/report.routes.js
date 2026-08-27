import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createReportHandler,
  listMyReportsHandler,
} from "../controllers/report.controller.js";

const router = Router();

router.post("/", authenticate, createReportHandler);
router.get("/me", authenticate, listMyReportsHandler);

export default router;
