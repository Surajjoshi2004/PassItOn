import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createReviewHandler,
  listReviewsHandler,
  deleteReviewHandler,
  listMyReviewsHandler,
} from "../controllers/review.controller.js";

const router = Router();

router.post("/", authenticate, createReviewHandler);
router.get("/mine", authenticate, listMyReviewsHandler);
router.get("/user/:userId", listReviewsHandler);
router.delete("/:id", authenticate, deleteReviewHandler);

export default router;
