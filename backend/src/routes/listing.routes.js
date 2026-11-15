import { Router } from "express";
import {
  authenticate,
  requireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import {
  listListingsHandler,
  graduatingSoonHandler,
  createListingHandler,
  duplicateCheckHandler,
  getListingHandler,
  updateListingHandler,
  deleteListingHandler,
} from "../controllers/listing.controller.js";

const router = Router();

router.get("/", listListingsHandler);
router.get("/graduating-soon", graduatingSoonHandler);
router.post("/duplicate-check", authenticate, requireVerifiedEmail, duplicateCheckHandler);
router.post("/", authenticate, requireVerifiedEmail, createListingHandler);
router.get("/:id", getListingHandler);
router.patch("/:id", authenticate, requireVerifiedEmail, updateListingHandler);
router.delete("/:id", authenticate, requireVerifiedEmail, deleteListingHandler);

export default router;
