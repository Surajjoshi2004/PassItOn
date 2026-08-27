import mongoose from "mongoose";
import {
  startOrGetConversation,
  listConversationsForUser,
  getConversationById,
} from "../services/conversation.service.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const errorStatusMap = {
  LISTING_NOT_FOUND: { code: 404, message: "Listing not found" },
  CANNOT_MESSAGE_SELF: {
    code: 400,
    message: "You cannot start a conversation with yourself",
  },
  NOT_FOUND: { code: 404, message: "Conversation not found" },
  FORBIDDEN: {
    code: 403,
    message: "You are not part of this conversation",
  },
};

const respondError = (res, error) => {
  const mapped = errorStatusMap[error];
  if (mapped) {
    return res.status(mapped.code).json({
      success: false,
      message: mapped.message,
    });
  }
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export const startConversationHandler = async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId || !isValidObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        message: "A valid listingId is required",
      });
    }

    const { conversation, error } = await startOrGetConversation({
      listingId,
      buyerId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(201).json({
      success: true,
      message: "Conversation ready",
      data: conversation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listConversationsHandler = async (req, res) => {
  try {
    const conversations = await listConversationsForUser(req.user.id);

    return res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getConversationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id",
      });
    }

    const { conversation, error } = await getConversationById({
      conversationId: id,
      userId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
