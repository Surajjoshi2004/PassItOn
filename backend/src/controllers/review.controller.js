import mongoose from "mongoose";
import {
  createReview,
  listReviewsForUser,
  deleteReview,
  getAverageRating,
} from "../services/review.service.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const errorStatusMap = {
  NOT_FOUND: { code: 404, message: "Reservation not found" },
  TRANSACTION_NOT_COMPLETED: {
    code: 400,
    message: "You can only review a completed transaction",
  },
  FORBIDDEN: {
    code: 403,
    message: "You are not authorized to review this transaction",
  },
  ALREADY_REVIEWED: {
    code: 409,
    message: "You have already reviewed this transaction",
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

export const createReviewHandler = async (req, res) => {
  try {
    const { reservationId, rating, comment } = req.body;

    if (!reservationId || !isValidObjectId(reservationId)) {
      return res.status(400).json({
        success: false,
        message: "A valid reservationId is required",
      });
    }

    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const { review, error } = await createReview({
      reviewerId: req.user.id,
      reservationId,
      rating,
      comment: comment || "",
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listReviewsHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const reviews = await listReviewsForUser(userId);
    const stats = await getAverageRating(userId);

    return res.status(200).json({
      success: true,
      rating: {
        average: Math.round(stats.average * 10) / 10,
        count: stats.count,
      },
      count: reviews.length,
      data: reviews,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteReviewHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id",
      });
    }

    const { error } = await deleteReview({
      reviewId: id,
      reviewerId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
