import "server-only";

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
});
