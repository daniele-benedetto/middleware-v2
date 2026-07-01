import "server-only";

import { z } from "zod";

import {
  createObservabilityCsvExport,
  observabilityCsvExportDtoSchema,
} from "@/lib/server/modules/observability/model";
import {
  listObservabilityAuditQuerySchema,
  observabilityAuditActivitiesListDtoSchema,
  observabilityAuditActivityDetailDtoSchema,
  observabilityAuditIdInputSchema,
  observabilityAuditPolicy,
  observabilityAuditService,
  observabilityAuditSummaryDtoSchema,
} from "@/lib/server/modules/observability-audit";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const observabilityAuditListInputSchema = paginationInputSchema.extend({
  query: listObservabilityAuditQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

const observabilityAuditExportInputSchema = z.object({
  query: listObservabilityAuditQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
  limit: z.number().int().min(1).max(1000).default(500),
});

export const observabilityAuditRouter = router({
  summary: protectedProcedure
    .use(requireRoleMiddleware(observabilityAuditPolicy.allowedRoles))
    .query(async () => {
      return parseOutput(
        await observabilityAuditService.summary(),
        observabilityAuditSummaryDtoSchema,
      );
    }),
  list: protectedProcedure
    .use(requireRoleMiddleware(observabilityAuditPolicy.allowedRoles))
    .input(observabilityAuditListInputSchema)
    .query(async ({ input }) => {
      const result = await observabilityAuditService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, observabilityAuditActivitiesListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  detail: protectedProcedure
    .use(requireRoleMiddleware(observabilityAuditPolicy.allowedRoles))
    .input(observabilityAuditIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await observabilityAuditService.detail(input.id),
        observabilityAuditActivityDetailDtoSchema,
      );
    }),
  exportCsv: protectedProcedure
    .use(requireRoleMiddleware(observabilityAuditPolicy.allowedRoles))
    .input(observabilityAuditExportInputSchema)
    .query(async ({ input }) => {
      const result = await observabilityAuditService.list(input.query, {
        page: 1,
        pageSize: input.limit,
      });
      const rows = parseOutput(result.items, observabilityAuditActivitiesListDtoSchema);

      return parseOutput(
        createObservabilityCsvExport({
          filename: "observability-audit.csv",
          rows,
          total: result.total,
          columns: [
            { header: "id", value: (row) => row.id },
            { header: "actor", value: (row) => row.actorDisplayName },
            { header: "action", value: (row) => row.action },
            { header: "resourceType", value: (row) => row.resourceType },
            { header: "resourceId", value: (row) => row.resourceId },
            { header: "resourceTitle", value: (row) => row.resourceTitle },
            { header: "outcome", value: (row) => row.outcome },
            { header: "riskLevel", value: (row) => row.riskLevel },
            { header: "publicImpact", value: (row) => row.publicImpact },
            { header: "changedFields", value: (row) => row.changedFields.join("; ") },
            { header: "requestId", value: (row) => row.requestId },
            { header: "createdAt", value: (row) => row.createdAt },
          ],
        }),
        observabilityCsvExportDtoSchema,
      );
    }),
});
