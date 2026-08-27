import mongoose from "mongoose";
import {
  sendMessage,
  listMessages,
} from "../services/message.service.js";
import { emitNewMessage } from "../realtime/socket.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const errorStatusMap = {
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

export const sendMessageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id",
      });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message body is required",
      });
    }

    const { message, conversation, error } = await sendMessage({
      conversationId: id,
      senderId: req.user.id,
      body: body.trim(),
    });

    if (error) {
      return respondError(res, error);
    }

    emitNewMessage({ message, conversation });

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id",
      });
    }

    const { messages, error } = await listMessages({
      conversationId: id,
      userId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
