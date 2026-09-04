import "server-only";

import { enforceSameOrigin } from "@/lib/server/http/origin";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { toTrpcError } from "@/lib/server/trpc/errors";
import { publicProcedure } from "@/lib/server/trpc/init";
import { rateLimitMiddleware } from "@/lib/server/trpc/middlewares/rate-limit";
import { requireSessionMiddleware } from "@/lib/server/trpc/middlewares/require-session";

export const publicReadProcedure = publicProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.publicRead),
);

function publicMutationProcedure(
  policy: (typeof rateLimitPolicies)[keyof typeof rateLimitPolicies],
) {
  return publicProcedure.use(async ({ ctx, next }) => {
    try {
      enforceSameOrigin(ctx.request);
      await enforceRateLimit(ctx.request, policy);
      return await next();
    } catch (error) {
      throw toTrpcError(error);
    }
  });
}

export const publicResponderProcedure = publicMutationProcedure(rateLimitPolicies.publicRead);
export const publicQuestionnaireSubmitProcedure = publicMutationProcedure(
  rateLimitPolicies.questionnaireSubmit,
);
export const protectedProcedure = publicProcedure.use(requireSessionMiddleware);
export const externalReadProcedure = protectedProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.externalRead),
);
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
