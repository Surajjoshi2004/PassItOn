import { test, mock } from "node:test";
import assert from "node:assert/strict";

const save = mock.fn(async function () { return this; });
const deleteOne = mock.fn(async () => ({}));
const listing = {
  _id: "listing-1",
  seller: "seller-1",
  title: "Book",
  set(updates) { Object.assign(this, updates); },
  save,
  deleteOne,
};
const Listing = {
  create: mock.fn(async (data) => ({ ...data, _id: "listing-1" })),
  findById: mock.fn(async () => listing),
};
await mock.module("../src/models/Listing.js", { defaultExport: Listing });

const { createListing, updateListing, deleteListing } = await import(
  "../src/services/listing.service.js"
);

test("listing CRUD service creates a seller-owned listing", async () => {
  const created = await createListing({ sellerId: "seller-1", data: { title: "Book" } });
  assert.equal(created.seller, "seller-1");
  assert.equal(Listing.create.mock.calls.length, 1);
});

test("listing update allows the owner and persists changes", async () => {
  const result = await updateListing({ listingId: "listing-1", sellerId: "seller-1", data: { title: "Updated", ignored: true } });
  assert.equal(result.error, null);
  assert.equal(result.listing.title, "Updated");
  assert.equal(save.mock.calls.length, 1);
});

test("listing update and delete reject another seller", async () => {
  assert.equal((await updateListing({ listingId: "listing-1", sellerId: "other", data: { title: "No" } })).error, "FORBIDDEN");
  assert.equal((await deleteListing({ listingId: "listing-1", sellerId: "other" })).error, "FORBIDDEN");
  assert.equal(deleteOne.mock.calls.length, 0);
});

test("listing delete allows the owner", async () => {
  const result = await deleteListing({ listingId: "listing-1", sellerId: "seller-1" });
  assert.equal(result.error, null);
  assert.equal(deleteOne.mock.calls.length, 1);
});
