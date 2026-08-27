import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "../config/env.js";
import Conversation from "../models/Conversation.js";
import { sendMessage } from "../services/message.service.js";

let io;

const conversationRoom = (conversationId) => `conversation:${conversationId}`;
const userRoom = (userId) => `user:${userId}`;

const errorPayload = (code, message) => ({ ok: false, error: { code, message } });

const serialiseMessage = (message) =>
  typeof message?.toObject === "function" ? message.toObject() : message;

export const emitNewMessage = ({ message, conversation }) => {
  if (!io) return;

  const payload = {
    conversationId: conversation._id.toString(),
    message: serialiseMessage(message),
  };
  const senderId = message.sender.toString();
  const recipientId =
    conversation.buyer.toString() === senderId
      ? conversation.seller.toString()
      : conversation.buyer.toString();

  io.to(conversationRoom(payload.conversationId)).emit("message:new", payload);
  io.to(userRoom(recipientId)).emit("notification:new", {
    type: "NEW_MESSAGE",
    conversationId: payload.conversationId,
    message: payload.message,
  });
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = {
        id: payload.sub,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified,
      };
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.user.id));

    socket.on("conversation:join", async ({ conversationId } = {}, acknowledge = () => {}) => {
      if (!mongoose.isValidObjectId(conversationId)) {
        return acknowledge(errorPayload("INVALID_CONVERSATION_ID", "Invalid conversation id"));
      }

      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return acknowledge(errorPayload("NOT_FOUND", "Conversation not found"));
        }
        const isParticipant =
          conversation.buyer.toString() === socket.user.id ||
          conversation.seller.toString() === socket.user.id;
        if (!isParticipant) {
          return acknowledge(errorPayload("FORBIDDEN", "You are not part of this conversation"));
        }

        socket.join(conversationRoom(conversationId));
        return acknowledge({ ok: true, conversationId });
      } catch {
        return acknowledge(errorPayload("INTERNAL_ERROR", "Unable to join conversation"));
      }
    });

    socket.on("conversation:leave", ({ conversationId } = {}, acknowledge = () => {}) => {
      if (mongoose.isValidObjectId(conversationId)) {
        socket.leave(conversationRoom(conversationId));
      }
      acknowledge({ ok: true });
    });

    socket.on("message:send", async ({ conversationId, body } = {}, acknowledge = () => {}) => {
      if (!mongoose.isValidObjectId(conversationId)) {
        return acknowledge(errorPayload("INVALID_CONVERSATION_ID", "Invalid conversation id"));
      }
      if (typeof body !== "string" || !body.trim()) {
        return acknowledge(errorPayload("INVALID_MESSAGE", "Message body is required"));
      }

      try {
        const result = await sendMessage({
          conversationId,
          senderId: socket.user.id,
          body: body.trim(),
        });
        if (result.error) {
          const messages = {
            NOT_FOUND: "Conversation not found",
            FORBIDDEN: "You are not part of this conversation",
          };
          return acknowledge(errorPayload(result.error, messages[result.error]));
        }

        emitNewMessage(result);
        return acknowledge({ ok: true, data: serialiseMessage(result.message) });
      } catch {
        return acknowledge(errorPayload("INTERNAL_ERROR", "Unable to send message"));
      }
    });

    // Socket.IO automatically removes this socket from every room on disconnect.
    socket.on("disconnect", () => {});
  });

  return io;
};
