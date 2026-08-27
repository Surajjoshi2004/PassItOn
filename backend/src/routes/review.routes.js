import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createReviewHandler,
  listReviewsHandler,
  deleteReviewHandler,
} from "../controllers/review.controller.js";

const router = Router();

router.post("/", authenticate, createReviewHandler);
router.get("/user/:userId", listReviewsHandler);
router.delete("/:id", authenticate, deleteReviewHandler);

export default router;
