import mongoose from "mongoose";
import {
  createListing,
  listListings,
  listGraduatingSoonListings,
  getListingById,
  updateListing,
  deleteListing,
} from "../services/listing.service.js";
import { findPotentialDuplicates } from "../services/duplicate-listing.service.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

export const createListingHandler = async (req, res) => {
  try {
    if (
      req.body.images !== undefined &&
      (!Array.isArray(req.body.images) ||
        req.body.images.length > 5 ||
        req.body.images.some((image) => typeof image !== "string" || !image.startsWith("data:image/")))
    ) {
      return res.status(400).json({
        success: false,
        message: "Add up to 5 valid image files",
      });
    }
    const { confirmDuplicate, ...listingData } = req.body;
    const potentialDuplicates = await findPotentialDuplicates({
      sellerId: req.user.id,
      data: listingData,
    });

    if (potentialDuplicates.length && confirmDuplicate !== true) {
      return res.status(409).json({
        success: false,
        code: "POTENTIAL_DUPLICATE",
        message: "Potentially duplicate listings found. Review them and resend with confirmDuplicate: true to continue.",
        data: { potentialDuplicates },
      });
    }

    const listing = await createListing({
      sellerId: req.user.id,
      data: listingData,
    });
    return res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: listing,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const duplicateCheckHandler = async (req, res) => {
  try {
    const potentialDuplicates = await findPotentialDuplicates({
      sellerId: req.user.id,
      data: req.body,
    });

    return res.status(200).json({
      success: true,
      hasPotentialDuplicates: potentialDuplicates.length > 0,
      data: { potentialDuplicates },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const parseOptionalNumber = (value) =>
  value === undefined || value === "" ? undefined : Number(value);

export const listListingsHandler = async (req, res) => {
  try {
    const minPrice = parseOptionalNumber(req.query.minPrice);
    const maxPrice = parseOptionalNumber(req.query.maxPrice);

    if (
      (req.query.minPrice !== undefined && Number.isNaN(minPrice)) ||
      (req.query.maxPrice !== undefined && Number.isNaN(maxPrice))
    ) {
      return res.status(400).json({
        success: false,
        message: "minPrice and maxPrice must be valid numbers",
      });
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({
        success: false,
        message: "minPrice cannot be greater than maxPrice",
      });
    }

    const page = parseOptionalNumber(req.query.page) || 1;
    const limit = parseOptionalNumber(req.query.limit) || 10;

    if (
      (req.query.page !== undefined && Number.isNaN(page)) ||
      (req.query.limit !== undefined && Number.isNaN(limit))
    ) {
      return res.status(400).json({
        success: false,
        message: "page and limit must be valid numbers",
      });
    }

    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: "page must be at least 1",
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "limit must be between 1 and 100",
      });
    }

    const result = await listListings({
      search: req.query.search,
      category: req.query.category,
      condition: req.query.condition,
      hostel: req.query.hostel,
      status: req.query.status,
      minPrice,
      maxPrice,
      sort: req.query.sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.listings,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const graduatingSoonHandler = async (req, res) => {
  try {
    const listings = await listGraduatingSoonListings();

    return res.status(200).json({
      success: true,
      count: listings.length,
      data: listings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getListingHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing id",
      });
    }

    const listing = await getListingById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateListingHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing id",
      });
    }

    const { confirmDuplicate, ...listingData } = req.body;
    const existingListing = await getListingById(id);
    if (!existingListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }
    if (existingListing.seller._id?.toString() !== req.user.id && existingListing.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this listing",
      });
    }

    const potentialDuplicates = await findPotentialDuplicates({
      sellerId: req.user.id,
      data: { ...existingListing.toObject(), ...listingData },
      excludeListingId: id,
    });
    if (potentialDuplicates.length && confirmDuplicate !== true) {
      return res.status(409).json({
        success: false,
        code: "POTENTIAL_DUPLICATE",
        message: "Potentially duplicate listings found. Review them and resend with confirmDuplicate: true to continue.",
        data: { potentialDuplicates },
      });
    }

    const { listing, error } = await updateListing({
      listingId: id,
      sellerId: req.user.id,
      data: listingData,
    });

    if (error === "LISTING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this listing",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: listing,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteListingHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing id",
      });
    }

    const { error } = await deleteListing({
      listingId: id,
      sellerId: req.user.id,
    });

    if (error === "LISTING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this listing",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
