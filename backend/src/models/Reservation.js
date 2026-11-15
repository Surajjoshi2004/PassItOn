
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing is required"],
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"],
    },

    status: {
      type: String,
      enum: ["pending", "cancelled", "rejected", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Index for buyer's reservations, newest first
reservationSchema.index({ buyer: 1, status: 1, createdAt: -1 });

// Index for listing reservations by status, newest first
reservationSchema.index({ listing: 1, status: 1, createdAt: -1 });

// Prevent duplicate pending reservations for the same listing and buyer
reservationSchema.index(
  { listing: 1, buyer: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
