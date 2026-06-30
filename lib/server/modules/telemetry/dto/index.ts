import { z } from "zod";

export const telemetryMetricPointDtoSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const telemetryTopItemDtoSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const telemetryAnalyticsSummaryDtoSchema = z.object({
  totals: z.object({
    views: z.number(),
    visitors: z.number(),
  }),
  viewsByDay: z.array(telemetryMetricPointDtoSchema),
  topPages: z.array(telemetryTopItemDtoSchema),
  topReferrers: z.array(telemetryTopItemDtoSchema),
  topCountries: z.array(telemetryTopItemDtoSchema),
});

export const telemetryPerformanceMetricDtoSchema = z.object({
  name: z.string(),
  path: z.string(),
  count: z.number(),
  p50: z.number().nullable(),
  p75: z.number().nullable(),
  p95: z.number().nullable(),
  good: z.number(),
  needsImprovement: z.number(),
  poor: z.number(),
});

export const telemetryPerformanceSummaryDtoSchema = z.object({
  metrics: z.array(telemetryPerformanceMetricDtoSchema),
});

export const telemetryErrorLogDtoSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  name: z.string().nullable(),
  message: z.string(),
  path: z.string().nullable(),
  routePath: z.string().nullable(),
  routeType: z.string().nullable(),
  count: z.number(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
});

export const telemetryErrorLogDetailDtoSchema = telemetryErrorLogDtoSchema.extend({
  fingerprint: z.string(),
  digest: z.string().nullable(),
  method: z.string().nullable(),
  requestId: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.unknown().nullable(),
});

export const telemetryErrorLogsListDtoSchema = z.array(telemetryErrorLogDtoSchema);

export type TelemetryAnalyticsSummaryDto = z.infer<typeof telemetryAnalyticsSummaryDtoSchema>;
export type TelemetryPerformanceSummaryDto = z.infer<typeof telemetryPerformanceSummaryDtoSchema>;
export type TelemetryErrorLogDto = z.infer<typeof telemetryErrorLogDtoSchema>;
export type TelemetryErrorLogDetailDto = z.infer<typeof telemetryErrorLogDetailDtoSchema>;
