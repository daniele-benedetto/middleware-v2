import "server-only";

import {
  observabilityPerformancePolicy,
  observabilityPerformanceService,
  performanceDetailDtoSchema,
  performanceDetailQuerySchema,
  performanceSummaryDtoSchema,
  performanceTrendDtoSchema,
  performanceTrendQuerySchema,
  performanceWorstPagesDtoSchema,
  performanceWorstPagesQuerySchema,
  performanceQuerySchema,
} from "@/lib/server/modules/observability-performance";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const worstPagesInputSchema = paginationInputSchema.extend({
  query: performanceWorstPagesQuerySchema.default({
    days: 30,
    sortBy: "impact",
    sortOrder: "desc",
  }),
});

export const performanceRouter = router({
  summary: protectedProcedure
    .use(requireRoleMiddleware(observabilityPerformancePolicy.allowedRoles))
    .input(performanceQuerySchema.default({ days: 30 }))
    .query(async ({ input }) => {
      return parseOutput(
        await observabilityPerformanceService.getSummary(input),
        performanceSummaryDtoSchema,
      );
    }),
  worstPages: protectedProcedure
    .use(requireRoleMiddleware(observabilityPerformancePolicy.allowedRoles))
    .input(worstPagesInputSchema)
    .query(async ({ input }) => {
      const result = await observabilityPerformanceService.listWorstPages(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, performanceWorstPagesDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  trend: protectedProcedure
    .use(requireRoleMiddleware(observabilityPerformancePolicy.allowedRoles))
    .input(performanceTrendQuerySchema.default({ days: 30, metric: "lcp" }))
    .query(async ({ input }) => {
      return parseOutput(
        await observabilityPerformanceService.getTrend(input),
        performanceTrendDtoSchema,
      );
    }),
  detail: protectedProcedure
    .use(requireRoleMiddleware(observabilityPerformancePolicy.allowedRoles))
    .input(performanceDetailQuerySchema)
    .query(async ({ input }) => {
      return parseOutput(
        await observabilityPerformanceService.getDetail(input),
        performanceDetailDtoSchema,
      );
    }),
});
