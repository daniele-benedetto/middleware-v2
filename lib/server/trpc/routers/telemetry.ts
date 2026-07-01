import "server-only";

import {
  contentEngagementDetailQuerySchema,
  listContentEngagementQuerySchema,
  telemetryContentEngagementListDtoSchema,
  telemetryContentEngagementDetailDtoSchema,
  telemetryEngagementQuerySchema,
  telemetryEngagementSummaryDtoSchema,
  telemetryPolicy,
  telemetryService,
} from "@/lib/server/modules/telemetry";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const contentEngagementListInputSchema = paginationInputSchema.extend({
  query: listContentEngagementQuerySchema.default({
    days: 30,
    sortBy: "qualifiedVisits",
    sortOrder: "desc",
  }),
});

export const telemetryRouter = router({
  engagementSummary: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(telemetryEngagementQuerySchema.default({ days: 30 }))
    .query(async ({ input }) => {
      return parseOutput(
        await telemetryService.getEngagementSummary(input),
        telemetryEngagementSummaryDtoSchema,
      );
    }),
  contentEngagementList: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(contentEngagementListInputSchema)
    .query(async ({ input }) => {
      const result = await telemetryService.listContentEngagement(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, telemetryContentEngagementListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  contentEngagementDetail: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(contentEngagementDetailQuerySchema.default({ days: 30 }))
    .query(async ({ input }) => {
      return parseOutput(
        await telemetryService.getContentEngagementDetail(input),
        telemetryContentEngagementDetailDtoSchema,
      );
    }),
});
