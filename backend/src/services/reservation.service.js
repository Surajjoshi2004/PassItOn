import Listing from "../models/Listing.js";
import Reservation from "../models/Reservation.js";

export const createReservation = async ({ listingId, buyerId }) => {
  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, status: "active", seller: { $ne: buyerId } },
      { $set: { status: "reserved" } },
      { new: true }
    ).populate("seller", "_id");

    if (!listing) {
      const originalListing = await Listing.findById(listingId).select("seller");
      return {
        reservation: null,
        error: originalListing?.seller?.toString() === buyerId
          ? "CANNOT_RESERVE_OWN"
          : "LISTING_NOT_AVAILABLE",
      };
    }

    const reservation = await Reservation.create({
      listing: listingId,
      buyer: buyerId,
      status: "pending",
    });

    return { reservation, error: null };
  } catch (error) {
    if (error.code === 11000) {
      return { reservation: null, error: "ALREADY_RESERVED" };
    }
    throw error;
  }
};

const sellerOwnsListing = (listing, sellerId) =>
  listing.seller &&
  (listing.seller._id
    ? listing.seller._id.toString()
    : listing.seller.toString()) === sellerId;

const updateReservationAndListing = async ({ reservationId, sellerId, buyerId, newStatus, listingAction }) => {
  try {
    const reservation = await Reservation.findOne({
      _id: reservationId,
      status: "pending",
    })
      .populate("listing", "seller status");

    if (!reservation) {
      return { reservation: null, error: "NOT_FOUND" };
    }

    const listing = reservation.listing;

    if (sellerId && listing.seller._id.toString() !== sellerId) {
      return { reservation: null, error: "FORBIDDEN" };
    }

    if (buyerId && reservation.buyer.toString() !== buyerId) {
      return { reservation: null, error: "FORBIDDEN" };
    }

    reservation.status = newStatus;
    await reservation.save();

    if (listingAction) {
      await Listing.findOneAndUpdate(
        { _id: listing._id },
        { $set: { status: listingAction } }
      );
    }

    return { reservation, error: null };
  } catch (error) {
    throw error;
  }
};

export const acceptReservation = ({ reservationId, sellerId }) =>
  updateReservationAndListing({
    reservationId,
    sellerId,
    newStatus: "accepted",
    listingAction: null,
  });

export const rejectReservation = ({ reservationId, sellerId }) =>
  updateReservationAndListing({
    reservationId,
    sellerId,
    newStatus: "rejected",
    listingAction: "active",
  });

export const cancelReservation = ({ reservationId, buyerId }) =>
  updateReservationAndListing({
    reservationId,
    buyerId,
    newStatus: "cancelled",
    listingAction: "active",
  });

export const listReservations = async ({ listingId, buyerId, status, sellerId }) => {
  const filter = {};
  if (listingId) {
    if (sellerId) {
      const listing = await Listing.findOne({ _id: listingId, seller: sellerId }).select("_id");
      if (!listing) {
        return { reservations: null, error: "FORBIDDEN" };
      }
    }
    filter.listing = listingId;
  }
  if (buyerId) filter.buyer = buyerId;
  if (status) filter.status = status;

  const reservations = await Reservation.find(filter)
    .populate("listing", "title price images category")
    .populate("buyer", "name email college")
    .sort({ createdAt: -1 });

  return { reservations, error: null };
};
