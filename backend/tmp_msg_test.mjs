import { test, mock } from "node:test";
import assert from "node:assert/strict";

const buyerId = "60f000000000000000000001";
const sellerId = "60f000000000000000000002";
const outsiderId = "60f000000000000000000003";

const STORE = {};

await mock.module("./src/models/Conversation.js", {
  defaultExport: {
    findById: mock.fn(async () => STORE.conv),
    updateOne: mock.fn(async () => ({})),
  },
});
const messageCreate = mock.fn();
const messageFind = mock.fn();
const messageUpdateMany = mock.fn(async () => ({}));
await mock.module("./src/models/Message.js", {
  defaultExport: {
    create: messageCreate,
    find: messageFind,
    updateMany: messageUpdateMany,
  },
});

const { sendMessage, listMessages } = await import("./src/services/message.service.js");

const conv = { _id: "c1", buyer: buyerId, seller: sellerId, toObject: () => ({ _id: "c1", buyer: buyerId, seller: sellerId }) };

test("buyer cannot message outsider - FORBIDDEN", async () => {
  STORE.conv = conv;
  messageCreate.mock.resetCalls();
  messageCreate.mock.mockReset?.();
  const r = await sendMessage({ conversationId: "c1", senderId: outsiderId, body: "hi" });
  assert.equal(r.error, "FORBIDDEN");
});

test("participant can send message and it is marked read by sender", async () => {
  STORE.conv = conv;
  messageCreate.mock.resetCalls();
  messageCreate.mock.mockImplementation(async (d) => ({ ...d, _id: "m1", createdAt: new Date() }));
  const r = await sendMessage({ conversationId: "c1", senderId: buyerId, body: "hello seller" });
  assert.equal(r.error, null);
  const args = messageCreate.mock.calls[0].arguments[0];
  assert.equal(args.conversation, "c1");
  assert.equal(args.sender, buyerId);
  assert.equal(args.body, "hello seller");
  assert.deepEqual(args.readBy, [buyerId]);
});

test("list messages - outsider forbidden", async () => {
  STORE.conv = conv;
  const r = await listMessages({ conversationId: "c1", userId: outsiderId });
  assert.equal(r.error, "FORBIDDEN");
});

test("list messages - participant allowed and marks read", async () => {
  STORE.conv = conv;
  messageFind.mock.resetCalls();
  messageFind.mock.mockImplementation(() => ({
    sort: () => ({ populate: async () => [{ _id: "m1" }] }),
  }));
  const r = await listMessages({ conversationId: "c1", userId: buyerId });
  assert.equal(r.error, null);
  assert.equal(Array.isArray(r.messages), true);
});

test("list messages - missing conversation NOT_FOUND", async () => {
  STORE.conv = null;
  const r = await listMessages({ conversationId: "ghost", userId: buyerId });
  assert.equal(r.error, "NOT_FOUND");
});
