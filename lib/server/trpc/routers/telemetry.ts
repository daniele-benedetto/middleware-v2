import "server-only";

import { z } from "zod";

import {
  listTelemetryErrorsQuerySchema,
  telemetryErrorGroupDetailDtoSchema,
  telemetryErrorGroupDtoSchema,
  telemetryErrorGroupsListDtoSchema,
  telemetryPolicy,
  telemetryService,
  updateTelemetryErrorStatusSchema,
} from "@/lib/server/modules/telemetry";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const telemetryErrorsListInputSchema = paginationInputSchema.extend({
  query: listTelemetryErrorsQuerySchema.default({
    sortBy: "lastSeenAt",
    sortOrder: "desc",
  }),
});

const telemetryErrorIdInputSchema = z.object({
  id: z.string().uuid(),
});

export const telemetryRouter = router({
  errorsList: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(telemetryErrorsListInputSchema)
    .query(async ({ input }) => {
      const result = await telemetryService.listErrorGroups(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, telemetryErrorGroupsListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  errorDetail: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(telemetryErrorIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await telemetryService.getErrorGroupById(input.id),
        telemetryErrorGroupDetailDtoSchema,
      );
    }),
  updateErrorStatus: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(updateTelemetryErrorStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return parseOutput(
        await telemetryService.updateErrorGroupStatus(input.id, input.status, ctx.session.user.id),
        telemetryErrorGroupDtoSchema,
      );
    }),
});
