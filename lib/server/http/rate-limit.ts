import "server-only";

import { getRedisClient } from "@/lib/redis";
import { ApiError } from "@/lib/server/http/api-error";
import { getRequestClientIp } from "@/lib/server/http/request";

type RateLimitPolicy = {
  name: string;
  limit: number;
  windowMs: number;
};

type WindowCounter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, WindowCounter>();
const MAX_COUNTERS = 10_000;

const RATE_LIMIT_INCREMENT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

export const rateLimitPolicies = {
  write: { name: "write", limit: 60, windowMs: 60_000 },
  sensitiveWrite: { name: "sensitive-write", limit: 20, windowMs: 60_000 },
  publish: { name: "publish", limit: 30, windowMs: 60_000 },
  reorder: { name: "reorder", limit: 15, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

const maybePruneCounters = (now: number) => {
  if (counters.size < MAX_COUNTERS) {
    return;
  }

  for (const [key, counter] of counters) {
    if (counter.resetAt <= now) {
      counters.delete(key);
    }
  }
};

type RateLimitCounter = {
  count: number;
  resetAt: number;
};

function isProductionRateLimit(): boolean {
  return process.env.NODE_ENV === "production";
}

function buildRateLimitBackendUnavailableError(): ApiError {
  return new ApiError(500, "INTERNAL_ERROR", "Rate limit backend unavailable");
}

function buildRateLimitKey(request: Request, policy: RateLimitPolicy): string {
  const url = new URL(request.url);
  const clientIp = getRequestClientIp(request) ?? "unknown";
  return `${policy.name}:${request.method}:${url.pathname}:${clientIp}`;
}

function incrementInMemoryCounter(
  key: string,
  policy: RateLimitPolicy,
  now: number,
): RateLimitCounter {
  maybePruneCounters(now);

  const current = counters.get(key);

  if (!current || current.resetAt <= now) {
    const nextCounter = {
      count: 1,
      resetAt: now + policy.windowMs,
    };

    counters.set(key, nextCounter);
    return nextCounter;
  }

  const nextCounter = {
    count: current.count + 1,
    resetAt: current.resetAt,
  };

  counters.set(key, nextCounter);
  return nextCounter;
}

async function incrementRedisCounter(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitCounter | null> {
  const redis = await getRedisClient();

  if (!redis) {
    return null;
  }

  const result = await redis.eval(RATE_LIMIT_INCREMENT_SCRIPT, {
    keys: [key],
    arguments: [String(policy.windowMs)],
  });

  if (!Array.isArray(result) || result.length < 2) {
    throw new Error("Invalid Redis rate limit response");
  }

  const count = Number(result[0]);
  const ttl = Number(result[1]);

  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error("Invalid Redis rate limit counter values");
  }

  return {
    count,
    resetAt: Date.now() + Math.max(ttl, 0),
  };
}

async function incrementRequiredRedisCounter(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitCounter> {
  const counter = await incrementRedisCounter(key, policy);

  if (!counter) {
    throw new Error("Redis rate limit backend is unavailable");
  }

  return counter;
}

export async function enforceRateLimit(request: Request, policy: RateLimitPolicy): Promise<void> {
  const now = Date.now();
  const key = buildRateLimitKey(request, policy);

  let counter: RateLimitCounter;

  if (isProductionRateLimit()) {
    try {
      counter = await incrementRequiredRedisCounter(key, policy);
    } catch (error) {
      console.error("RATE_LIMIT_BACKEND_UNAVAILABLE", error);
      throw buildRateLimitBackendUnavailableError();
    }

    if (counter.count > policy.limit) {
      throw new ApiError(429, "RATE_LIMITED", "Rate limit exceeded for this endpoint");
    }

    return;
  }

  try {
    counter =
      (await incrementRedisCounter(key, policy)) ?? incrementInMemoryCounter(key, policy, now);
  } catch {
    counter = incrementInMemoryCounter(key, policy, now);
  }

  if (counter.count > policy.limit) {
    throw new ApiError(429, "RATE_LIMITED", "Rate limit exceeded for this endpoint");
  }
}
