import "server-only";

import { getRedisClient } from "@/lib/redis";

import type { BetterAuthRateLimitStorage, RateLimit } from "better-auth";

const AUTH_RATE_LIMIT_KEY_PREFIX = "better-auth:rate-limit";
const AUTH_RATE_LIMIT_CONSUME_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return { current, ttl }
`;

function buildRateLimitKey(key: string) {
  return `${AUTH_RATE_LIMIT_KEY_PREFIX}:${key}`;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

async function getRequiredRedisClient() {
  const redis = await getRedisClient();

  if (!redis && isProduction()) {
    throw new Error("Redis auth rate limit backend is unavailable");
  }

  return redis;
}

export const authRateLimitStorage: BetterAuthRateLimitStorage = {
  async get(key) {
    const redis = await getRequiredRedisClient();

    if (!redis) {
      return null;
    }

    const value = await redis.get(buildRateLimitKey(key));
    return value ? (JSON.parse(value) as RateLimit) : null;
  },
  async set(key, value) {
    const redis = await getRequiredRedisClient();

    if (!redis) {
      return;
    }

    await redis.set(buildRateLimitKey(key), JSON.stringify(value), { EX: 3600 });
  },
  async consume(key, rule) {
    const redis = await getRequiredRedisClient();

    if (!redis) {
      return { allowed: true, retryAfter: null };
    }

    const result = await redis.eval(AUTH_RATE_LIMIT_CONSUME_SCRIPT, {
      keys: [buildRateLimitKey(key)],
      arguments: [String(rule.window)],
    });

    if (!Array.isArray(result) || result.length < 2) {
      throw new Error("Invalid Redis auth rate limit response");
    }

    const count = Number(result[0]);
    const ttl = Number(result[1]);

    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error("Invalid Redis auth rate limit counter values");
    }

    return {
      allowed: count <= rule.max,
      retryAfter: count > rule.max ? Math.max(ttl, 0) : null,
    };
  },
};
