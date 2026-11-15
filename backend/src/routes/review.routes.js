import { Router } from "express";
import {
  authenticate,
  requireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import {
  createReviewHandler,
  listReviewsHandler,
  deleteReviewHandler,
  listMyReviewsHandler,
} from "../controllers/review.controller.js";

const router = Router();

router.post("/", authenticate, requireVerifiedEmail, createReviewHandler);
router.get("/mine", authenticate, requireVerifiedEmail, listMyReviewsHandler);
router.get("/user/:userId", listReviewsHandler);
router.delete("/:id", authenticate, requireVerifiedEmail, deleteReviewHandler);

export default router;
