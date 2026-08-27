import Reservation from "../models/Reservation.js";
import Review from "../models/Review.js";

export const createReview = async ({ reviewerId, reservationId, rating, comment }) => {
  const reservation = await Reservation.findById(reservationId)
    .populate("listing", "seller");

  if (!reservation) {
    return { review: null, error: "NOT_FOUND" };
  }

  if (reservation.status !== "accepted") {
    return { review: null, error: "TRANSACTION_NOT_COMPLETED" };
  }

  const buyerId = reservation.buyer.toString();
  const sellerId =
    reservation.listing.seller._id
      ? reservation.listing.seller._id.toString()
      : reservation.listing.seller.toString();

  const isBuyer = reviewerId === buyerId;
  const isSeller = reviewerId === sellerId;

  if (!isBuyer && !isSeller) {
    return { review: null, error: "FORBIDDEN" };
  }

  const revieweeId = isBuyer ? sellerId : buyerId;

  try {
    const review = await Review.create({
      reviewer: reviewerId,
      reviewee: revieweeId,
      reservation: reservationId,
      rating,
      comment,
    });
    return { review, error: null };
  } catch (error) {
    if (error.code === 11000) {
      return { review: null, error: "ALREADY_REVIEWED" };
    }
    throw error;
  }
};

export const getReviewById = (id) => {
  return Review.findById(id);
};

export const listReviewsForUser = (userId) => {
  return Review.find({ reviewee: userId })
    .populate("reviewer", "name college profileImage")
    .populate("reservation", "listing")
    .sort({ createdAt: -1 });
};

export const deleteReview = async ({ reviewId, reviewerId }) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    return { error: "NOT_FOUND" };
  }

  if (review.reviewer.toString() !== reviewerId) {
    return { error: "FORBIDDEN" };
  }

  await review.deleteOne();
  return { error: null };
};

export const getAverageRating = async (userId) => {
  const result = await Review.aggregate([
    { $match: { reviewee: userId } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return result[0] || { average: 0, count: 0 };
};
