import { z } from "zod";

import {
  observabilityContentTypeValues,
  observabilityPageTypeValues,
  observabilityRawEventTypeValues,
} from "@/lib/server/modules/observability/model";

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

const sensitiveMetadataKeyPattern =
  /(authorization|token|secret|password|cookie|set-cookie|body|payload|email)/i;
const metadataValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const observabilityMetadataSchema = z
  .record(z.string().trim().min(1).max(80), metadataValueSchema)
  .refine((value) => Object.keys(value).length <= 20, {
    message: "Observability metadata can contain at most 20 keys",
  })
  .refine((value) => JSON.stringify(value).length <= 2048, {
    message: "Observability metadata must be at most 2KB when serialized",
  })
  .refine((value) => Object.keys(value).every((key) => !sensitiveMetadataKeyPattern.test(key)), {
    message: "Observability metadata cannot contain sensitive keys",
  });

const observabilityPathSchema = z.string().trim().min(1).max(512).startsWith("/");
const nullableTextSchema = z.string().trim().min(1).max(200).optional().nullable();
const eventTypeSchema = z.enum([
  "session_start",
  "session_heartbeat",
  "session_end",
  "page_enter",
  "page_exit",
  "visibility_change",
  "scroll_milestone",
  "client_error",
]);

const baseCollectorEventSchema = z.object({
  type: eventTypeSchema,
  path: observabilityPathSchema.optional().nullable(),
  pageType: z.enum(observabilityPageTypeValues).optional().nullable(),
  contentId: z.string().trim().min(1).max(120).optional().nullable(),
  contentType: z.enum(observabilityContentTypeValues).optional().nullable(),
  sampleRate: z.number().finite().positive().max(1).default(1),
  clientSequence: z.number().int().nonnegative(),
  clientElapsedMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000),
  metadata: observabilityMetadataSchema.optional(),
});

export const telemetryCollectorEventSchema = baseCollectorEventSchema.extend({
  source: z.enum(["client", "boundary"]).optional().nullable(),
  name: z.string().trim().min(1).max(120).optional().nullable(),
  message: z.string().trim().min(1).max(1000).optional().nullable(),
  digest: z.string().trim().min(1).max(160).optional().nullable(),
  stack: z.string().trim().min(1).max(8000).optional().nullable(),
  requestId: nullableTextSchema,
  correlationId: nullableTextSchema,
  release: z.string().trim().min(1).max(120).optional().nullable(),
});

export const telemetryCollectorPayloadSchema = z.object({
  sessionId: z.string().trim().min(16).max(120),
  pageInstanceId: z.string().trim().min(8).max(120),
  collectionMode: z.enum(["full", "minimal"]),
  referrer: z.string().trim().min(1).max(512).optional().nullable(),
  events: z.array(telemetryCollectorEventSchema).min(1).max(50),
});

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

export type TelemetryCollectorEvent = z.infer<typeof telemetryCollectorEventSchema>;
export type TelemetryCollectorPayload = z.infer<typeof telemetryCollectorPayloadSchema>;
export type ObservabilityRawEventType = (typeof observabilityRawEventTypeValues)[number];
export type ObservabilityMetadata = z.infer<typeof observabilityMetadataSchema>;
export type ObservabilityErrorSource = (typeof observabilityErrorSourceValues)[number];
export type ObservabilityErrorSeverity = (typeof observabilityErrorSeverityValues)[number];
export type ObservabilityErrorStatus = (typeof observabilityErrorStatusValues)[number];
export type ObservabilityImpactArea = (typeof observabilityImpactAreaValues)[number];
export type ObservabilityUserImpact = (typeof observabilityUserImpactValues)[number];
export type ListTelemetryErrorsQuery = z.infer<typeof listTelemetryErrorsQuerySchema>;
export type UpdateTelemetryErrorStatusInput = z.infer<typeof updateTelemetryErrorStatusSchema>;
