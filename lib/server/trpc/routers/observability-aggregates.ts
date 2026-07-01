import "server-only";

import { TRPCError } from "@trpc/server";

import {
  canReadObservabilityAggregates,
  canRunObservabilityJobs,
  observabilityAggregateQuerySchema,
  observabilityAggregatesOverviewDtoSchema,
  observabilityAggregatesService,
  observabilityAggregationJobInputSchema,
  observabilityAggregationResultDtoSchema,
} from "@/lib/server/modules/observability-aggregates";
import { router } from "@/lib/server/trpc/init";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

function forbiddenError() {
  return new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
}

export const observabilityAggregatesRouter = router({
  overview: protectedProcedure
    .input(observabilityAggregateQuerySchema.default({ days: 30 }))
    .query(async ({ ctx, input }) => {
      if (!canReadObservabilityAggregates(ctx.session.user.role)) throw forbiddenError();
      return parseOutput(
        await observabilityAggregatesService.overview(input),
        observabilityAggregatesOverviewDtoSchema,
      );
    }),
  aggregate: protectedProcedure
    .input(observabilityAggregationJobInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!canRunObservabilityJobs(ctx.session.user.role)) throw forbiddenError();
      return parseOutput(
        await observabilityAggregatesService.aggregate(input),
        observabilityAggregationResultDtoSchema,
      );
    }),
});
