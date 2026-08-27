import Listing from "../models/Listing.js";

export const DUPLICATE_WARNING_THRESHOLD = 65;
const MAX_CANDIDATES = 25;
const STOP_WORDS = new Set([
  "a", "an", "and", "the", "for", "of", "to", "in", "with", "is", "my", "this",
]);

const normaliseText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (value) =>
  new Set(normaliseText(value).split(" ").filter((word) => word && !STOP_WORDS.has(word)));

const jaccardSimilarity = (left, right) => {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
};

const priceSimilarity = (left, right) => {
  const leftPrice = Number(left);
  const rightPrice = Number(right);
  if (!Number.isFinite(leftPrice) || !Number.isFinite(rightPrice)) return 0;
  if (leftPrice === rightPrice) return 1;

  const baseline = Math.max(leftPrice, rightPrice, 1);
  // Prices more than 30% apart do not contribute to a duplicate match.
  return Math.max(0, 1 - Math.abs(leftPrice - rightPrice) / baseline / 0.3);
};

// Kept independent from persistence so embeddings or image similarity can be added as new signals.
export const calculateListingSimilarity = (candidate, existing) => {
  const title = jaccardSimilarity(candidate.title, existing.title);
  const description = jaccardSimilarity(candidate.description, existing.description);
  const category =
    normaliseText(candidate.category) === normaliseText(existing.category) ? 1 : 0;
  const price = priceSimilarity(candidate.price, existing.price);

  const score = Math.round(title * 55 + description * 25 + category * 10 + price * 10);
  return {
    score,
    breakdown: {
      title: Math.round(title * 100),
      description: Math.round(description * 100),
      category: Math.round(category * 100),
      price: Math.round(price * 100),
    },
  };
};

export const findPotentialDuplicates = async ({ sellerId, data, excludeListingId }) => {
  if (!data?.title || !data?.description || !data?.category || data?.price === undefined) {
    return [];
  }

  const filter = {
    seller: sellerId,
    category: normaliseText(data.category),
    status: { $in: ["active", "reserved"] },
  };
  if (excludeListingId) filter._id = { $ne: excludeListingId };

  const listings = await Listing.find(filter)
    .select("title description price category status")
    .limit(MAX_CANDIDATES);

  return listings
    .map((listing) => {
      const { score, breakdown } = calculateListingSimilarity(data, listing);
      return {
        listingId: listing._id.toString(),
        title: listing.title,
        description: listing.description,
        category: listing.category,
        price: listing.price,
        status: listing.status,
        score,
        scoreBreakdown: breakdown,
      };
    })
    .filter((listing) => listing.score >= DUPLICATE_WARNING_THRESHOLD)
    .sort((left, right) => right.score - left.score);
};
