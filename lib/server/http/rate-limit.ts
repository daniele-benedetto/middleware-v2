import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

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

export const rateLimitPolicies = {
  write: { name: "write", limit: 60, windowMs: 60_000 },
  sensitiveWrite: { name: "sensitive-write", limit: 20, windowMs: 60_000 },
  publish: { name: "publish", limit: 30, windowMs: 60_000 },
  reorder: { name: "reorder", limit: 15, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [ip] = forwardedFor.split(",");
    return ip.trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

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

export function enforceRateLimit(request: Request, policy: RateLimitPolicy): void {
  const now = Date.now();
  maybePruneCounters(now);

  const url = new URL(request.url);
  const clientIp = getClientIp(request);
  const key = `${policy.name}:${request.method}:${url.pathname}:${clientIp}`;
  const current = counters.get(key);

  if (!current || current.resetAt <= now) {
    counters.set(key, {
      count: 1,
      resetAt: now + policy.windowMs,
    });
    return;
  }

  if (current.count >= policy.limit) {
    throw new ApiError(429, "RATE_LIMITED", "Rate limit exceeded for this endpoint");
  }

  counters.set(key, {
    count: current.count + 1,
    resetAt: current.resetAt,
  });
}
