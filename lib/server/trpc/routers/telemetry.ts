import "server-only";

import { z } from "zod";

import {
  listTelemetryErrorsQuerySchema,
  telemetryAnalyticsSummaryDtoSchema,
  telemetryErrorLogDetailDtoSchema,
  telemetryErrorLogsListDtoSchema,
  telemetryPerformanceSummaryDtoSchema,
  telemetryPeriodQuerySchema,
  telemetryPolicy,
  telemetryService,
} from "@/lib/server/modules/telemetry";
import { router } from "@/lib/server/trpc/init";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const telemetryPeriodInputSchema = telemetryPeriodQuerySchema.default({ days: 30 });

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
  analyticsSummary: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(telemetryPeriodInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await telemetryService.getAnalyticsSummary(input),
        telemetryAnalyticsSummaryDtoSchema,
      );
    }),
  performanceSummary: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(telemetryPeriodInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await telemetryService.getPerformanceSummary(input),
        telemetryPerformanceSummaryDtoSchema,
      );
    }),
  errorsList: protectedProcedure
    .use(requireRoleMiddleware(telemetryPolicy.allowedRoles))
    .input(telemetryErrorsListInputSchema)
    .query(async ({ input }) => {
      const result = await telemetryService.listErrorLogs(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, telemetryErrorLogsListDtoSchema),
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
        await telemetryService.getErrorLogById(input.id),
        telemetryErrorLogDetailDtoSchema,
      );
    }),
});
