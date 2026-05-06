import "server-only";

import { z } from "zod";

import {
  auditLogDetailDtoSchema,
  auditLogsListDtoSchema,
  auditLogsPolicy,
  auditLogsService,
  listAuditLogsQuerySchema,
} from "@/lib/server/modules/audit-logs";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const auditLogsListInputSchema = paginationInputSchema.extend({
  query: listAuditLogsQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

const auditLogIdInputSchema = z.object({
  id: z.string().uuid(),
});

export const auditLogsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(auditLogsPolicy.allowedRoles))
    .input(auditLogsListInputSchema)
    .query(async ({ input }) => {
      const result = await auditLogsService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, auditLogsListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(auditLogsPolicy.allowedRoles))
    .input(auditLogIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await auditLogsService.getById(input.id), auditLogDetailDtoSchema);
    }),
});
