import "server-only";

import { z } from "zod";

import {
  createObservabilityCsvExport,
  observabilityCsvExportDtoSchema,
} from "@/lib/server/modules/observability/model";
import {
  listObservabilityErrorsQuerySchema,
  observabilityErrorGroupDetailDtoSchema,
  observabilityErrorGroupDtoSchema,
  observabilityErrorGroupsListDtoSchema,
  observabilityErrorsPolicy,
  observabilityErrorsService,
  updateObservabilityErrorStatusSchema,
} from "@/lib/server/modules/observability-errors";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const observabilityErrorsListInputSchema = paginationInputSchema.extend({
  query: listObservabilityErrorsQuerySchema.default({
    sortBy: "priorityScore",
    sortOrder: "desc",
  }),
});

const observabilityErrorsExportInputSchema = z.object({
  query: listObservabilityErrorsQuerySchema.default({
    sortBy: "priorityScore",
    sortOrder: "desc",
  }),
  limit: z.number().int().min(1).max(1000).default(500),
});

const observabilityErrorIdInputSchema = z.object({ id: z.string().uuid() });

export const observabilityErrorsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(observabilityErrorsPolicy.allowedRoles))
    .input(observabilityErrorsListInputSchema)
    .query(async ({ input }) => {
      const result = await observabilityErrorsService.listGroups(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, observabilityErrorGroupsListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  detail: protectedProcedure
    .use(requireRoleMiddleware(observabilityErrorsPolicy.allowedRoles))
    .input(observabilityErrorIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await observabilityErrorsService.getGroupById(input.id),
        observabilityErrorGroupDetailDtoSchema,
      );
    }),
  updateStatus: protectedProcedure
    .use(requireRoleMiddleware(observabilityErrorsPolicy.allowedRoles))
    .input(updateObservabilityErrorStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return parseOutput(
        await observabilityErrorsService.updateStatus(input.id, input.status, ctx.session.user.id),
        observabilityErrorGroupDtoSchema,
      );
    }),
  exportCsv: protectedProcedure
    .use(requireRoleMiddleware(observabilityErrorsPolicy.allowedRoles))
    .input(observabilityErrorsExportInputSchema)
    .query(async ({ input }) => {
      const result = await observabilityErrorsService.listGroups(input.query, {
        page: 1,
        pageSize: input.limit,
      });
      const rows = parseOutput(result.items, observabilityErrorGroupsListDtoSchema);

      return parseOutput(
        createObservabilityCsvExport({
          filename: "observability-errors.csv",
          rows,
          total: result.total,
          columns: [
            { header: "id", value: (row) => row.id },
            { header: "title", value: (row) => row.title },
            { header: "severity", value: (row) => row.severity },
            { header: "status", value: (row) => row.status },
            { header: "priorityScore", value: (row) => row.priorityScore },
            { header: "impactArea", value: (row) => row.impactArea },
            { header: "userImpact", value: (row) => row.userImpact },
            { header: "regression", value: (row) => row.regression },
            { header: "occurrenceCount", value: (row) => row.occurrenceCount },
            { header: "affectedSessions", value: (row) => row.affectedSessions },
            { header: "lastSeenAt", value: (row) => row.lastSeenAt },
            { header: "lastRelease", value: (row) => row.lastRelease },
          ],
        }),
        observabilityCsvExportDtoSchema,
      );
    }),
});
