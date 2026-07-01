import "server-only";

import { z } from "zod";

import {
  createObservabilityCsvExport,
  observabilityCsvExportDtoSchema,
} from "@/lib/server/modules/observability/model";
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

const contentEngagementExportInputSchema = z.object({
  query: listContentEngagementQuerySchema.default({
    days: 30,
    sortBy: "qualifiedVisits",
    sortOrder: "desc",
  }),
  limit: z.number().int().min(1).max(1000).default(500),
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
  exportContentCsv: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(contentEngagementExportInputSchema)
    .query(async ({ input }) => {
      const result = await telemetryService.listContentEngagement(input.query, {
        page: 1,
        pageSize: input.limit,
      });
      const rows = parseOutput(result.items, telemetryContentEngagementListDtoSchema);

      return parseOutput(
        createObservabilityCsvExport({
          filename: "observability-telemetry-content.csv",
          rows,
          total: result.total,
          columns: [
            { header: "contentId", value: (row) => row.contentId },
            { header: "slug", value: (row) => row.slug },
            { header: "path", value: (row) => row.path },
            { header: "pageType", value: (row) => row.pageType },
            { header: "contentType", value: (row) => row.contentType },
            { header: "qualifiedVisits", value: (row) => row.qualifiedVisits },
            { header: "completedReads", value: (row) => row.completedReads },
            { header: "completionRate", value: (row) => row.completionRate },
            { header: "averageActiveTimeMs", value: (row) => row.averageActiveTimeMs },
            { header: "returnCountInSession", value: (row) => row.returnCountInSession },
            { header: "refreshCount", value: (row) => row.refreshCount },
            { header: "lastSeenAt", value: (row) => row.lastSeenAt },
          ],
        }),
        observabilityCsvExportDtoSchema,
      );
    }),
});
