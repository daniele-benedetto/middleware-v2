import { z } from "zod";

import { errorSeverityValues, errorStatusValues } from "@/lib/server/modules/observability/model";

export const observabilityErrorSourceValues = ["server", "client", "boundary"] as const;
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
export const observabilityErrorActionContextValues = [
  "login",
  "publish",
  "unpublish",
  "save_editorial",
  "upload_media",
  "delete_media",
  "delete_content",
  "update_navigation",
  "role_change",
  "unknown",
] as const;

export const observabilityErrorSourceSchema = z.enum(observabilityErrorSourceValues);
export const observabilityErrorSeveritySchema = z.enum(errorSeverityValues);
export const observabilityErrorStatusSchema = z.enum(errorStatusValues);
export const observabilityImpactAreaSchema = z.enum(observabilityImpactAreaValues);
export const observabilityUserImpactSchema = z.enum(observabilityUserImpactValues);
export const observabilityErrorActionContextSchema = z.enum(observabilityErrorActionContextValues);

const nullableTextSchema = z.string().trim().min(1).max(200).optional().nullable();
const pathSchema = z.string().trim().min(1).max(512).startsWith("/").optional().nullable();

export const recordObservabilityErrorInputSchema = z.object({
  source: observabilityErrorSourceSchema,
  sessionId: z.string().trim().min(16).max(120).optional().nullable(),
  isLikelyBot: z.boolean().optional(),
  name: z.string().trim().min(1).max(120).optional().nullable(),
  message: z.string().trim().min(1).max(1000),
  digest: z.string().trim().min(1).max(160).optional().nullable(),
  stack: z.string().trim().min(1).max(8000).optional().nullable(),
  path: pathSchema,
  pageType: z.string().trim().min(1).max(80).optional().nullable(),
  contentId: z.string().trim().min(1).max(120).optional().nullable(),
  contentType: z.string().trim().min(1).max(80).optional().nullable(),
  routePath: pathSchema,
  routeType: z.string().trim().min(1).max(80).optional().nullable(),
  method: z.string().trim().min(1).max(20).optional().nullable(),
  statusCode: z.number().int().min(100).max(599).optional().nullable(),
  actionContext: z.string().trim().min(1).max(120).optional().nullable(),
  requestId: nullableTextSchema,
  correlationId: nullableTextSchema,
  release: z.string().trim().min(1).max(120).optional().nullable(),
  sampleRate: z.number().finite().positive().max(1).optional().nullable(),
  clientSequence: z.number().int().nonnegative().optional().nullable(),
  clientElapsedMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000)
    .optional()
    .nullable(),
  metadata: z.unknown().optional(),
});

export const listObservabilityErrorsQuerySchema = z.object({
  source: observabilityErrorSourceSchema.optional(),
  severity: observabilityErrorSeveritySchema.optional(),
  status: observabilityErrorStatusSchema.optional(),
  impactArea: observabilityImpactAreaSchema.optional(),
  userImpact: observabilityUserImpactSchema.optional(),
  regression: z.boolean().optional(),
  release: z.string().trim().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z
    .enum(["priorityScore", "lastSeenAt", "occurrenceCount", "firstSeenAt", "affectedSessions"])
    .default("priorityScore"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateObservabilityErrorStatusSchema = z.object({
  id: z.string().uuid(),
  status: observabilityErrorStatusSchema,
});

export type ObservabilityErrorSource = z.infer<typeof observabilityErrorSourceSchema>;
export type ObservabilityErrorSeverity = z.infer<typeof observabilityErrorSeveritySchema>;
export type ObservabilityErrorStatus = z.infer<typeof observabilityErrorStatusSchema>;
export type ObservabilityImpactArea = z.infer<typeof observabilityImpactAreaSchema>;
export type ObservabilityUserImpact = z.infer<typeof observabilityUserImpactSchema>;
export type ObservabilityErrorActionContext = z.infer<typeof observabilityErrorActionContextSchema>;
export type RecordObservabilityErrorInput = z.infer<typeof recordObservabilityErrorInputSchema>;
export type ListObservabilityErrorsQuery = z.infer<typeof listObservabilityErrorsQuerySchema>;
export type UpdateObservabilityErrorStatusInput = z.infer<
  typeof updateObservabilityErrorStatusSchema
>;
