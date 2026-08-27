import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import Reservation from "../models/Reservation.js";

export const createReservation = async ({ listingId, buyerId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, status: "active" },
      { $set: { status: "reserved" } },
      { new: true, session }
    ).populate("seller", "_id");

    if (!listing) {
      await session.abortTransaction();
      return { reservation: null, error: "LISTING_NOT_AVAILABLE" };
    }

    if (listing.seller._id.toString() === buyerId) {
      await session.abortTransaction();
      return { reservation: null, error: "CANNOT_RESERVE_OWN" };
    }

    const existingPending = await Reservation.findOne({
      listing: listingId,
      status: "pending",
    }).session(session);

    if (existingPending) {
      await session.abortTransaction();
      return { reservation: null, error: "ALREADY_RESERVED" };
    }

    const reservation = await Reservation.create(
      [{ listing: listingId, buyer: buyerId, status: "pending" }],
      { session }
    );

    await session.commitTransaction();
    return { reservation: reservation[0], error: null };
  } catch (error) {
    await session.abortTransaction();
    if (error.code === 11000) {
      return { reservation: null, error: "ALREADY_RESERVED" };
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const sellerOwnsListing = (listing, sellerId) =>
  listing.seller &&
  (listing.seller._id
    ? listing.seller._id.toString()
    : listing.seller.toString()) === sellerId;

const updateReservationAndListing = async ({ reservationId, sellerId, buyerId, newStatus, listingAction }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findOne({
      _id: reservationId,
      status: "pending",
    })
      .populate("listing", "seller status")
      .session(session);

    if (!reservation) {
      await session.abortTransaction();
      return { reservation: null, error: "NOT_FOUND" };
    }

    const listing = reservation.listing;

    if (sellerId && listing.seller._id.toString() !== sellerId) {
      await session.abortTransaction();
      return { reservation: null, error: "FORBIDDEN" };
    }

    if (buyerId && reservation.buyer.toString() !== buyerId) {
      await session.abortTransaction();
      return { reservation: null, error: "FORBIDDEN" };
    }

    reservation.status = newStatus;
    await reservation.save({ session });

    if (listingAction) {
      await Listing.findOneAndUpdate(
        { _id: listing._id },
        { $set: { status: listingAction } },
        { session }
      );
    }

    await session.commitTransaction();
    return { reservation, error: null };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
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
