import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
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
router.post("/duplicate-check", authenticate, duplicateCheckHandler);
router.post("/", authenticate, createListingHandler);
router.get("/:id", getListingHandler);
router.patch("/:id", authenticate, updateListingHandler);
router.delete("/:id", authenticate, deleteListingHandler);

export default router;
