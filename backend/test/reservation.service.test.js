import { test, mock } from "node:test";
import assert from "node:assert/strict";

const Listing = {
  findOneAndUpdate: mock.fn((filter) => ({
    populate: mock.fn(async () =>
      filter.seller.$ne === "seller-1" ? null : { _id: "listing-1", seller: { _id: "seller-1" } }
    ),
  })),
  findById: mock.fn(() => ({ select: mock.fn(async () => ({ seller: "seller-1" })) })),
};
const Reservation = {
  create: mock.fn(async (data) => ({ ...data, _id: "reservation-1" })),
};
await mock.module("../src/models/Listing.js", { defaultExport: Listing });
await mock.module("../src/models/Reservation.js", { defaultExport: Reservation });

const { createReservation } = await import("../src/services/reservation.service.js");

test("reservation rejects a seller reserving their own listing", async () => {
  const result = await createReservation({ listingId: "listing-1", buyerId: "seller-1" });
  assert.equal(result.error, "CANNOT_RESERVE_OWN");
});

test("reservation creates a pending reservation for an available listing", async () => {
  const result = await createReservation({ listingId: "listing-1", buyerId: "buyer-1" });
  assert.equal(result.error, null);
  assert.equal(result.reservation.status, "pending");
});
