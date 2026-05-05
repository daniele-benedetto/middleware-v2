import "server-only";

import { enforceRateLimit } from "@/lib/server/http/rate-limit";
import { trpc } from "@/lib/server/trpc/init";

import type { rateLimitPolicies } from "@/lib/server/http/rate-limit";

type RateLimitPolicy = (typeof rateLimitPolicies)[keyof typeof rateLimitPolicies];

export function rateLimitMiddleware(policy: RateLimitPolicy) {
  return trpc.middleware(async ({ ctx, next }) => {
    await enforceRateLimit(ctx.request, policy);
    return next();
  });
}
