import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      lowercase: true,
      enum: {
        values: [
          "textbooks",
          "electronics",
          "furniture",
          "appliances",
          "clothing",
          "bicycles",
          "sports",
          "others",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum: {
        values: ["new", "like-new", "good", "fair", "poor"],
        message: "{VALUE} is not a valid condition",
      },
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "A listing can have at most 10 images",
      },
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
      index: true,
    },
    hostel: {
      type: String,
      trim: true,
    },
    availableFrom: {
      type: Date,
    },
    graduationDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "reserved", "sold", "expired"],
        message: "{VALUE} is not a valid status",
      },
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

listingSchema.index({ category: 1, status: 1, createdAt: -1 });
listingSchema.index({ price: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ status: 1, graduationDate: 1 });
listingSchema.index({ seller: 1, status: 1 });

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;
