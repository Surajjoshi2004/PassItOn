import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  startConversationHandler,
  listConversationsHandler,
  getConversationHandler,
} from "../controllers/conversation.controller.js";
import {
  sendMessageHandler,
  listMessagesHandler,
} from "../controllers/message.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", startConversationHandler);
router.get("/", listConversationsHandler);
router.get("/:id", getConversationHandler);
router.post("/:id/messages", sendMessageHandler);
router.get("/:id/messages", listMessagesHandler);

export default router;
