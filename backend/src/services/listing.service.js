import Listing from "../models/Listing.js";
import { GRADUATING_SOON_WINDOW_DAYS } from "../config/env.js";

const allowedUpdates = [
  "title",
  "description",
  "price",
  "category",
  "condition",
  "images",
  "hostel",
  "availableFrom",
  "graduationDate",
  "status",
];

export const createListing = ({ sellerId, data }) => {
  return Listing.create({
    ...data,
    seller: sellerId,
  });
};

export const getListingById = (id) => {
  return Listing.findById(id).populate("seller", "name college hostel profileImage");
};

const sortOptions = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

const buildFilter = ({ search, category, condition, hostel, status, minPrice, maxPrice }) => {
  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (condition) {
    filter.condition = condition;
  }

  if (hostel) {
    filter.hostel = hostel;
  }

  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ["active", "reserved"] };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
};

export const listListings = ({
  search,
  category,
  condition,
  hostel,
  status,
  minPrice,
  maxPrice,
  sort,
  page,
  limit,
}) => {
  const filter = buildFilter({
    search,
    category,
    condition,
    hostel,
    status,
    minPrice,
    maxPrice,
  });

  const skip = (page - 1) * limit;

  return Promise.all([
    Listing.countDocuments(filter),
    Listing.find(filter)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(skip)
      .limit(limit)
      .populate("seller", "name college hostel profileImage"),
  ]).then(([total, listings]) => ({
    total,
    listings,
    page,
    limit,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  }));
};

export const listGraduatingSoonListings = () => {
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + GRADUATING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const filter = {
    status: "active",
    graduationDate: { $gte: now, $lte: windowEnd },
  };

  return Listing.find(filter)
    .sort({ graduationDate: 1 })
    .populate("seller", "name college hostel profileImage graduationDate");
};


export const updateListing = async ({ listingId, sellerId, data }) => {
  const listing = await Listing.findById(listingId);

  if (!listing) {
    return { listing: null, error: "LISTING_NOT_FOUND" };
  }

  if (listing.seller.toString() !== sellerId) {
    return { listing: null, error: "FORBIDDEN" };
  }

  const updates = {};
  for (const key of Object.keys(data)) {
    if (allowedUpdates.includes(key)) {
      updates[key] = data[key];
    }
  }

  listing.set(updates);
  await listing.save();

  return { listing, error: null };
};

export const deleteListing = async ({ listingId, sellerId }) => {
  const listing = await Listing.findById(listingId);

  if (!listing) {
    return { error: "LISTING_NOT_FOUND" };
  }

  if (listing.seller.toString() !== sellerId) {
    return { error: "FORBIDDEN" };
  }

  await listing.deleteOne();
  return { error: null };
};
