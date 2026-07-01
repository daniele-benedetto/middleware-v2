import "server-only";

import { z } from "zod";

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
});
