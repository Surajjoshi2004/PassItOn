import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter is required"],
      index: true,
    },
    targetType: {
      type: String,
      enum: {
        values: ["listing", "user"],
        message: "targetType must be 'listing' or 'user'",
      },
      required: [true, "targetType is required"],
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Target is required"],
      refPath: "targetType",
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["open", "in_review", "resolved", "dismissed"],
        message: "{VALUE} is not a valid report status",
      },
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ targetType: 1, target: 1, status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
