import "server-only";

import {
  observabilityOverviewDtoSchema,
  observabilityOverviewPolicy,
  observabilityOverviewQuerySchema,
  observabilityOverviewService,
} from "@/lib/server/modules/observability-overview";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const observabilityOverviewRouter = router({
  overview: protectedProcedure
    .use(requireRoleMiddleware(observabilityOverviewPolicy.allowedRoles))
    .input(
      observabilityOverviewQuerySchema.default({
        days: 30,
        includeLowConfidence: false,
        limit: 12,
      }),
    )
    .query(async ({ input }) => {
      return parseOutput(
        await observabilityOverviewService.overview(input),
        observabilityOverviewDtoSchema,
      );
    }),
  insights: protectedProcedure
    .use(requireRoleMiddleware(observabilityOverviewPolicy.allowedRoles))
    .input(
      observabilityOverviewQuerySchema.default({
        days: 30,
        includeLowConfidence: false,
        limit: 12,
      }),
    )
    .query(async ({ input }) => {
      const overview = await observabilityOverviewService.overview(input);
      return parseOutput(overview.insights, observabilityOverviewDtoSchema.shape.insights);
    }),
});
