import net from "node:net";
import { REDIS_URL } from "./env.js";

const redisUrl = new URL(REDIS_URL);
const cachePrefix = "passiton:listings:";
const indexKey = `${cachePrefix}index`;
const CACHE_TTL_SECONDS = 45;
const INDEX_TTL_SECONDS = 60;
let retryRedisAfter = 0;

const encodeCommand = (parts) =>
  `*${parts.length}\r\n${parts.map((part) => {
    const value = String(part);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }).join("")}`;

const parseReply = (buffer, offset = 0) => {
  const marker = buffer[offset];
  const lineEnd = buffer.indexOf("\r\n", offset);
  if (lineEnd === -1) return null;

  if (marker === 43 || marker === 45 || marker === 58) {
    const value = buffer.toString("utf8", offset + 1, lineEnd);
    if (marker === 45) throw new Error(`Redis error: ${value}`);
    return { value: marker === 58 ? Number(value) : value, offset: lineEnd + 2 };
  }

  if (marker === 36) {
    const length = Number(buffer.toString("utf8", offset + 1, lineEnd));
    if (length === -1) return { value: null, offset: lineEnd + 2 };
    const end = lineEnd + 2 + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.toString("utf8", lineEnd + 2, end), offset: end + 2 };
  }

  if (marker === 42) {
    const count = Number(buffer.toString("utf8", offset + 1, lineEnd));
    let cursor = lineEnd + 2;
    const values = [];
    for (let i = 0; i < count; i += 1) {
      const parsed = parseReply(buffer, cursor);
      if (!parsed) return null;
      values.push(parsed.value);
      cursor = parsed.offset;
    }
    return { value: values, offset: cursor };
  }

  throw new Error("Unsupported Redis response");
};

const sendCommand = (socket, parts) => new Promise((resolve, reject) => {
  let buffer = Buffer.alloc(0);
  const onData = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    try {
      const parsed = parseReply(buffer);
      if (!parsed) return;
      socket.off("data", onData);
      resolve(parsed.value);
    } catch (error) {
      socket.off("data", onData);
      reject(error);
    }
  };
  socket.on("data", onData);
  socket.write(encodeCommand(parts));
});

const runRedisCommand = async (...parts) => {
  if (Date.now() < retryRedisAfter) throw new Error("Redis is temporarily unavailable");
  const socket = net.createConnection({
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
  });
  socket.setTimeout(1200);
  try {
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
      socket.once("timeout", () => reject(new Error("Redis connection timed out")));
    });

    if (redisUrl.password) {
      const credentials = redisUrl.username
        ? ["AUTH", decodeURIComponent(redisUrl.username), decodeURIComponent(redisUrl.password)]
        : ["AUTH", decodeURIComponent(redisUrl.password)];
      await sendCommand(socket, credentials);
    }
    const database = redisUrl.pathname.slice(1);
    if (database && database !== "0") await sendCommand(socket, ["SELECT", database]);
    const result = await sendCommand(socket, parts);
    retryRedisAfter = 0;
    return result;
  } catch (error) {
    retryRedisAfter = Date.now() + 3000;
    throw error;
  } finally {
    socket.destroy();
  }
};

export const getCachedJson = async (key, load, ttlSeconds = CACHE_TTL_SECONDS) => {
  try {
    const cached = await runRedisCommand("GET", key);
    if (cached) return JSON.parse(cached);
  } catch {
    // A cache outage must not take down the API.
  }

  const value = await load();
  try {
    await runRedisCommand(
      "EVAL",
      "redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2]); redis.call('SADD', KEYS[2], KEYS[1]); redis.call('EXPIRE', KEYS[2], ARGV[3]); return 1",
      "2",
      key,
      indexKey,
      JSON.stringify(value),
      String(ttlSeconds),
      String(INDEX_TTL_SECONDS)
    );
  } catch {
    // Serve the fresh database result if Redis is offline.
  }
  return value;
};

export const invalidateListingCache = async () => {
  try {
    await runRedisCommand(
      "EVAL",
      "local keys = redis.call('SMEMBERS', KEYS[1]); if #keys > 0 then redis.call('DEL', unpack(keys)) end; redis.call('DEL', KEYS[1]); return #keys",
      "1",
      indexKey
    );
  } catch {
    // TTL expiry bounds staleness when Redis is unavailable.
  }
};
