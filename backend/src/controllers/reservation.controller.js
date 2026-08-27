import mongoose from "mongoose";
import {
  createReservation,
  acceptReservation,
  rejectReservation,
  cancelReservation,
  listReservations,
} from "../services/reservation.service.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const errorStatusMap = {
  LISTING_NOT_AVAILABLE: { code: 400, message: "Listing is not available for reservation" },
  CANNOT_RESERVE_OWN: { code: 403, message: "You cannot reserve your own listing" },
  ALREADY_RESERVED: { code: 409, message: "This listing already has a pending reservation" },
  NOT_FOUND: { code: 404, message: "Reservation not found" },
  FORBIDDEN: { code: 403, message: "You are not authorized to perform this action" },
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

export const createReservationHandler = async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId || !isValidObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        message: "A valid listingId is required",
      });
    }

    const { reservation, error } = await createReservation({
      listingId,
      buyerId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(201).json({
      success: true,
      message: "Listing reserved successfully",
      data: reservation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listReservationsHandler = async (req, res) => {
  try {
    const { listingId, status } = req.query;

    if (listingId && !isValidObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listingId",
      });
    }

    const { reservations, error } = await listReservations({
      listingId,
      buyerId: req.query.mine === "true" ? req.user.id : undefined,
      sellerId: listingId ? req.user.id : undefined,
      status,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const acceptReservationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation id",
      });
    }

    const { reservation, error } = await acceptReservation({
      reservationId: id,
      sellerId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      message: "Reservation accepted",
      data: reservation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const rejectReservationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation id",
      });
    }

    const { reservation, error } = await rejectReservation({
      reservationId: id,
      sellerId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      message: "Reservation rejected",
      data: reservation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const cancelReservationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation id",
      });
    }

    const { reservation, error } = await cancelReservation({
      reservationId: id,
      buyerId: req.user.id,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(200).json({
      success: true,
      message: "Reservation cancelled",
      data: reservation,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
