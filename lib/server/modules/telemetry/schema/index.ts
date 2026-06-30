import { z } from "zod";

export const observabilityErrorSourceValues = ["server", "client", "boundary"] as const;
export const observabilityErrorSeverityValues = ["low", "medium", "high", "critical"] as const;
export const observabilityErrorStatusValues = [
  "open",
  "investigating",
  "resolved",
  "ignored",
] as const;
export const observabilityImpactAreaValues = [
  "cms",
  "public_site",
  "auth",
  "media",
  "editorial",
  "unknown",
] as const;
export const observabilityUserImpactValues = [
  "none",
  "minor",
  "blocked_action",
  "lost_content",
] as const;

const metadataValueSchema = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const observabilityMetadataSchema = z
  .record(z.string().min(1).max(80), metadataValueSchema)
  .refine((value) => JSON.stringify(value).length <= 2048, {
    message: "Observability metadata must be at most 2KB when serialized",
  });

const observabilityPathSchema = z.string().trim().min(1).max(512).startsWith("/");

export const clientErrorTelemetryPayloadSchema = z.object({
  type: z.literal("client-error"),
  source: z.enum(["client", "boundary"]),
  sessionId: z.string().trim().min(16).max(120).optional().nullable(),
  name: z.string().trim().min(1).max(120).optional().nullable(),
  message: z.string().trim().min(1).max(1000),
  digest: z.string().trim().min(1).max(160).optional().nullable(),
  stack: z.string().trim().min(1).max(8000).optional().nullable(),
  path: observabilityPathSchema.optional().nullable(),
  pageType: z.string().trim().min(1).max(80).optional().nullable(),
  contentId: z.string().trim().min(1).max(120).optional().nullable(),
  contentType: z.string().trim().min(1).max(80).optional().nullable(),
  requestId: z.string().trim().min(1).max(200).optional().nullable(),
  correlationId: z.string().trim().min(1).max(200).optional().nullable(),
  release: z.string().trim().min(1).max(120).optional().nullable(),
  sampleRate: z.number().finite().positive().max(1).default(1),
  clientSequence: z.number().int().nonnegative().optional().nullable(),
  clientElapsedMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000)
    .optional()
    .nullable(),
  metadata: observabilityMetadataSchema.optional(),
});

export const telemetryCollectorPayloadSchema = clientErrorTelemetryPayloadSchema;

export const listTelemetryErrorsQuerySchema = z.object({
  source: z.enum(observabilityErrorSourceValues).optional(),
  severity: z.enum(observabilityErrorSeverityValues).optional(),
  status: z.enum(observabilityErrorStatusValues).optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z
    .enum(["lastSeenAt", "occurrenceCount", "firstSeenAt", "affectedSessions"])
    .default("lastSeenAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateTelemetryErrorStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(observabilityErrorStatusValues),
});

export type ClientErrorTelemetryPayload = z.infer<typeof clientErrorTelemetryPayloadSchema>;
export type TelemetryCollectorPayload = z.infer<typeof telemetryCollectorPayloadSchema>;
export type ObservabilityMetadata = z.infer<typeof observabilityMetadataSchema>;
export type ObservabilityErrorSource = (typeof observabilityErrorSourceValues)[number];
export type ObservabilityErrorSeverity = (typeof observabilityErrorSeverityValues)[number];
export type ObservabilityErrorStatus = (typeof observabilityErrorStatusValues)[number];
export type ObservabilityImpactArea = (typeof observabilityImpactAreaValues)[number];
export type ObservabilityUserImpact = (typeof observabilityUserImpactValues)[number];
export type ListTelemetryErrorsQuery = z.infer<typeof listTelemetryErrorsQuerySchema>;
export type UpdateTelemetryErrorStatusInput = z.infer<typeof updateTelemetryErrorStatusSchema>;
