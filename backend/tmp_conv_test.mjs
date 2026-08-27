import { test, mock } from "node:test";
import assert from "node:assert/strict";

const buyerId = "60f000000000000000000001";
const sellerId = "60f000000000000000000002";
const outsiderId = "60f000000000000000000003";
const listingId = "60f000000000000000000004";

const STORE = {};

await mock.module("./src/models/Listing.js", {
  defaultExport: {
    findById: mock.fn(() => ({ select: async () => STORE.listing })),
  },
});
const convFindOneAndUpdate = mock.fn();
const convFind = mock.fn();
const convFindById = mock.fn(() => {
  const chainable = {
    populate() {
      return chainable;
    },
    then(resolve, reject) {
      return Promise.resolve(STORE.conv).then(resolve, reject);
    },
  };
  return chainable;
});
await mock.module("./src/models/Conversation.js", {
  defaultExport: {
    findOneAndUpdate: convFindOneAndUpdate,
    find: convFind,
    findById: convFindById,
    findOne: mock.fn(),
  },
});
const msgCount = mock.fn(async () => 0);
await mock.module("./src/models/Message.js", {
  defaultExport: {
    countDocuments: msgCount,
    find: mock.fn(),
  },
});

const { startOrGetConversation, getConversationById } = await import(
  "./src/services/conversation.service.js"
);

test("cannot start conversation with self", async () => {
  STORE.listing = { _id: listingId, seller: { toString: () => sellerId } };
  const r = await startOrGetConversation({ listingId, buyerId: sellerId });
  assert.equal(r.error, "CANNOT_MESSAGE_SELF");
});

test("start conversation succeeds for buyer", async () => {
  STORE.listing = { _id: listingId, seller: { toString: () => sellerId } };
  convFindOneAndUpdate.mock.resetCalls();
  convFindOneAndUpdate.mock.mockImplementation(async () => ({ _id: "c1" }));
  const r = await startOrGetConversation({ listingId, buyerId });
  assert.equal(r.error, null);
  const args = convFindOneAndUpdate.mock.calls[0].arguments;
  assert.deepEqual(args[0], { listing: listingId, buyer: buyerId, seller: sellerId });
});

test("missing listing returns LISTING_NOT_FOUND", async () => {
  STORE.listing = null;
  const r = await startOrGetConversation({ listingId, buyerId });
  assert.equal(r.error, "LISTING_NOT_FOUND");
});

const populatedConv = (buyer, seller) => ({
  _id: "c1",
  buyer: { _id, toString: () => buyer } && { _id: buyer, toString: () => buyer },
  seller: { _id: seller, toString: () => seller },
  listing: { _id: listingId },
  lastReadAt: {},
  toObject: () => ({ _id: "c1", buyer: { _id: buyer }, seller: { _id: seller } }),
});

test("outsider cannot access conversation - FORBIDDEN", async () => {
  STORE.conv = { _id: "c1", buyer: { _id: buyerId, toString: () => buyerId }, seller: { _id: sellerId, toString: () => sellerId }, lastReadAt: {}, toObject: () => ({}) };
  convFindById.mock.resetCalls();
  const r = await getConversationById({ conversationId: "c1", userId: outsiderId });
  assert.equal(r.error, "FORBIDDEN");
});
