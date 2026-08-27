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
      enum: {
        values: ["pending", "accepted", "rejected", "cancelled"],
        message: "{VALUE} is not a valid reservation status",
      },
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({ listing: 1, buyer: 1 });
reservationSchema.index({ buyer: 1, status: 1, createdAt: -1 });
reservationSchema.index({ listing: 1, status: 1, createdAt: -1 });

reservationSchema.index(
  { listing: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
