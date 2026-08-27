import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Listing from "../models/Listing.js";
import mongoose from "mongoose";

const getUnreadCount = (conversation, userId) => {
  const role = conversation.buyer.toString() === userId ? "buyer" : "seller";
  const lastReadAt = conversation.lastReadAt?.[role];

  return Message.countDocuments({
    conversation: conversation._id,
    sender: { $ne: userId },
    ...(lastReadAt ? { createdAt: { $gt: lastReadAt } } : {}),
  });
};

export const startOrGetConversation = async ({ listingId, buyerId }) => {
  const listing = await Listing.findById(listingId).select("seller status");

  if (!listing) {
    return { conversation: null, error: "LISTING_NOT_FOUND" };
  }

  const sellerId = listing.seller.toString();

  if (sellerId === buyerId) {
    return { conversation: null, error: "CANNOT_MESSAGE_SELF" };
  }

  try {
    let conversation = await Conversation.findOneAndUpdate(
      { listing: listingId, buyer: buyerId, seller: sellerId },
      { $setOnInsert: { buyer: buyerId, seller: sellerId, listing: listingId } },
      { upsert: true, new: true }
    );
    return { conversation, error: null };
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Conversation.findOne({
        listing: listingId,
        buyer: buyerId,
      });
      return { conversation: existing, error: null };
    }
    throw error;
  }
};

export const listConversationsForUser = async (userId) => {
  const conversations = await Conversation.find({
    $or: [{ buyer: userId }, { seller: userId }],
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate("listing", "title price images category")
    .populate("buyer", "name college profileImage")
    .populate("seller", "name college profileImage");

  return Promise.all(
    conversations.map(async (c) => {
      const unreadCount = await getUnreadCount(c, userId);
      return {
        ...c.toObject(),
        unreadCount,
        otherUser: (c.buyer._id.toString() === userId ? c.seller : c.buyer),
      };
    })
  );
};

export const getConversationById = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findById(conversationId)
    .populate("listing", "title price images category status")
    .populate("buyer", "name college profileImage")
    .populate("seller", "name college profileImage");

  if (!conversation) {
    return { conversation: null, error: "NOT_FOUND" };
  }

  const isParticipant =
    conversation.buyer._id.toString() === userId ||
    conversation.seller._id.toString() === userId;

  if (!isParticipant) {
    return { conversation: null, error: "FORBIDDEN" };
  }

  const unreadCount = await getUnreadCount(conversation, userId);

  return {
    conversation: {
      ...conversation.toObject(),
      unreadCount,
      otherUser:
        conversation.buyer._id.toString() === userId
          ? conversation.seller
          : conversation.buyer,
    },
    error: null,
  };
};
