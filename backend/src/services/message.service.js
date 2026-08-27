import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const sendMessage = async ({ conversationId, senderId, body }) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return { message: null, error: "NOT_FOUND" };
  }

  const isParticipant =
    conversation.buyer.toString() === senderId ||
    conversation.seller.toString() === senderId;

  if (!isParticipant) {
    return { message: null, error: "FORBIDDEN" };
  }

  const role = conversation.buyer.toString() === senderId ? "buyer" : "seller";

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    body,
    readBy: [senderId],
  });

  const link = { lastReadAt: {} };
  link.lastReadAt[role] = new Date();

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessage: body,
        lastMessageAt: message.createdAt,
        lastMessageSender: senderId,
        ...link,
      },
    }
  );

  return {
    message,
    conversation: { ...conversation.toObject(), lastMessageSender: senderId },
    error: null,
  };
};

const isParticipant = (conversation, userId) =>
  conversation.buyer.toString() === userId ||
  conversation.seller.toString() === userId;

export const listMessages = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return { messages: null, error: "NOT_FOUND" };
  }

  if (!isParticipant(conversation, userId)) {
    return { messages: null, error: "FORBIDDEN" };
  }

  const role = conversation.buyer.toString() === userId ? "buyer" : "seller";

  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .populate("sender", "name profileImage");

  const readMark = { lastReadAt: {} };
  readMark.lastReadAt[role] = new Date();
  await Conversation.updateOne({ _id: conversationId }, { $set: readMark });

  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  return { messages, error: null };
};
