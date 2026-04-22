import "server-only";

import { rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { publicProcedure } from "@/lib/server/trpc/init";
import { rateLimitMiddleware } from "@/lib/server/trpc/middlewares/rate-limit";
import { requireSessionMiddleware } from "@/lib/server/trpc/middlewares/require-session";

export const protectedProcedure = publicProcedure.use(requireSessionMiddleware);
export const writeProcedure = protectedProcedure.use(rateLimitMiddleware(rateLimitPolicies.write));
export const sensitiveWriteProcedure = protectedProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.sensitiveWrite),
);
export const publishProcedure = protectedProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.publish),
);
export const reorderProcedure = protectedProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.reorder),
);
