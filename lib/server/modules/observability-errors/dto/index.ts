import { z } from "zod";

import {
  observabilityErrorSeveritySchema,
  observabilityErrorSourceSchema,
  observabilityErrorStatusSchema,
  observabilityImpactAreaSchema,
  observabilityUserImpactSchema,
} from "@/lib/server/modules/observability-errors/schema";

export const observabilityErrorGroupDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  source: observabilityErrorSourceSchema,
  severity: observabilityErrorSeveritySchema,
  status: observabilityErrorStatusSchema,
  priorityScore: z.number().int().nonnegative(),
  priorityReasons: z.array(z.string()),
  occurrenceCount: z.number().int().nonnegative(),
  affectedSessions: z.number().int().nonnegative(),
  affectedPaths: z.array(z.string()),
  impactArea: observabilityImpactAreaSchema,
  userImpact: observabilityUserImpactSchema,
  regression: z.boolean(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  firstRelease: z.string().nullable(),
  lastRelease: z.string().nullable(),
});

export const observabilityErrorOccurrenceDtoSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().nullable(),
  requestId: z.string().nullable(),
  correlationId: z.string().nullable(),
  path: z.string().nullable(),
  routePath: z.string().nullable(),
  routeType: z.string().nullable(),
  method: z.string().nullable(),
  statusCode: z.number().nullable(),
  actionContext: z.string().nullable(),
  userAgent: z.string().nullable(),
  deviceType: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  stackTraceRedacted: z.string().nullable(),
  metadata: z.unknown().nullable(),
  occurredAt: z.string(),
});

export const observabilityErrorGroupDetailDtoSchema = observabilityErrorGroupDtoSchema.extend({
  fingerprint: z.string(),
  fingerprintVersion: z.number().int().positive(),
  errorSignature: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  reopenedAt: z.string().nullable(),
  reopenedBy: z.string().nullable(),
  lastStatusAt: z.string(),
  lastStatusBy: z.string().nullable(),
  occurrences: z.array(observabilityErrorOccurrenceDtoSchema),
});

export const observabilityErrorGroupsListDtoSchema = z.array(observabilityErrorGroupDtoSchema);

export type ObservabilityErrorGroupDto = z.infer<typeof observabilityErrorGroupDtoSchema>;
export type ObservabilityErrorGroupDetailDto = z.infer<
  typeof observabilityErrorGroupDetailDtoSchema
>;
export type ObservabilityErrorOccurrenceDto = z.infer<typeof observabilityErrorOccurrenceDtoSchema>;
