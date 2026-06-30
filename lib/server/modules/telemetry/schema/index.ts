import { z } from "zod";

export const analyticsEventValues = [
  "page_view",
  "article_view",
  "issue_view",
  "listen_view",
  "media_open",
] as const;

export const webVitalNameValues = ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"] as const;
export const webVitalRatingValues = ["good", "needs-improvement", "poor"] as const;
export const clientErrorSourceValues = ["client", "boundary"] as const;
export const errorLogSourceValues = ["server", ...clientErrorSourceValues] as const;

const metadataValueSchema = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const telemetryMetadataSchema = z
  .record(z.string().min(1).max(80), metadataValueSchema)
  .refine((value) => JSON.stringify(value).length <= 2048, {
    message: "Telemetry metadata must be at most 2KB when serialized",
  });

const telemetryPathSchema = z.string().trim().min(1).max(512).startsWith("/");

const telemetryReferrerSchema = z.string().trim().min(1).max(512).optional().nullable();

export const analyticsTelemetryPayloadSchema = z.object({
  type: z.literal("analytics"),
  event: z.enum(analyticsEventValues),
  path: telemetryPathSchema,
  referrer: telemetryReferrerSchema,
  metadata: telemetryMetadataSchema.optional(),
});

export const webVitalTelemetryPayloadSchema = z.object({
  type: z.literal("web-vital"),
  metricId: z.string().trim().min(1).max(120),
  name: z.enum(webVitalNameValues),
  value: z.number().finite(),
  delta: z.number().finite(),
  rating: z.enum(webVitalRatingValues).optional().nullable(),
  navigationType: z.string().trim().min(1).max(80).optional().nullable(),
  path: telemetryPathSchema,
});

export const clientErrorTelemetryPayloadSchema = z.object({
  type: z.literal("client-error"),
  source: z.enum(clientErrorSourceValues),
  name: z.string().trim().min(1).max(120).optional().nullable(),
  message: z.string().trim().min(1).max(1000),
  digest: z.string().trim().min(1).max(160).optional().nullable(),
  path: telemetryPathSchema.optional().nullable(),
  metadata: telemetryMetadataSchema.optional(),
});

export const telemetryCollectorPayloadSchema = z.discriminatedUnion("type", [
  analyticsTelemetryPayloadSchema,
  webVitalTelemetryPayloadSchema,
  clientErrorTelemetryPayloadSchema,
]);

export const telemetryPeriodQuerySchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

export const listTelemetryErrorsQuerySchema = z.object({
  source: z.enum(errorLogSourceValues).optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["lastSeenAt", "count", "firstSeenAt"]).default("lastSeenAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AnalyticsTelemetryPayload = z.infer<typeof analyticsTelemetryPayloadSchema>;
export type WebVitalTelemetryPayload = z.infer<typeof webVitalTelemetryPayloadSchema>;
export type ClientErrorTelemetryPayload = z.infer<typeof clientErrorTelemetryPayloadSchema>;
export type TelemetryCollectorPayload = z.infer<typeof telemetryCollectorPayloadSchema>;
export type TelemetryMetadata = z.infer<typeof telemetryMetadataSchema>;
export type ErrorLogSource = (typeof errorLogSourceValues)[number];
export type TelemetryPeriodQuery = z.infer<typeof telemetryPeriodQuerySchema>;
export type ListTelemetryErrorsQuery = z.infer<typeof listTelemetryErrorsQuerySchema>;
