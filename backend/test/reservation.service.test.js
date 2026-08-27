import { test, mock } from "node:test";
import assert from "node:assert/strict";

const session = {
  startTransaction: mock.fn(),
  abortTransaction: mock.fn(async () => {}),
  commitTransaction: mock.fn(async () => {}),
  endSession: mock.fn(),
};
const listingQuery = {
  populate: mock.fn(async () => ({ _id: "listing-1", seller: { _id: "seller-1" } })),
};
const Listing = {
  findOneAndUpdate: mock.fn(() => listingQuery),
  findOne: mock.fn(),
};
const Reservation = {
  findOne: mock.fn(() => ({ session: mock.fn(async () => null) })),
  create: mock.fn(async ([data]) => [{ ...data, _id: "reservation-1" }]),
};
await mock.module("mongoose", { defaultExport: { startSession: async () => session } });
await mock.module("../src/models/Listing.js", { defaultExport: Listing });
await mock.module("../src/models/Reservation.js", { defaultExport: Reservation });

const { createReservation } = await import("../src/services/reservation.service.js");

test("reservation rejects a seller reserving their own listing", async () => {
  const result = await createReservation({ listingId: "listing-1", buyerId: "seller-1" });
  assert.equal(result.error, "CANNOT_RESERVE_OWN");
  assert.equal(session.commitTransaction.mock.calls.length, 0);
});

test("reservation creates a pending reservation for an available listing", async () => {
  listingQuery.populate.mock.mockImplementationOnce(async () => ({ _id: "listing-1", seller: { _id: "seller-1" } }));
  const result = await createReservation({ listingId: "listing-1", buyerId: "buyer-1" });
  assert.equal(result.error, null);
  assert.equal(result.reservation.status, "pending");
  assert.equal(session.commitTransaction.mock.calls.length, 1);
});
