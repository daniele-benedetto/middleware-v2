import { z } from "zod";

import {
  observabilityErrorSeverityValues,
  observabilityErrorSourceValues,
  observabilityErrorStatusValues,
  observabilityImpactAreaValues,
  observabilityUserImpactValues,
} from "@/lib/server/modules/telemetry/schema";

export const telemetryErrorGroupDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  source: z.enum(observabilityErrorSourceValues),
  severity: z.enum(observabilityErrorSeverityValues),
  status: z.enum(observabilityErrorStatusValues),
  occurrenceCount: z.number(),
  affectedSessions: z.number(),
  affectedPaths: z.array(z.string()),
  impactArea: z.enum(observabilityImpactAreaValues),
  userImpact: z.enum(observabilityUserImpactValues),
  regression: z.boolean(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
});

export const telemetryErrorOccurrenceDtoSchema = z.object({
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
  stackTraceRedacted: z.string().nullable(),
  metadata: z.unknown().nullable(),
  occurredAt: z.string(),
});

export const telemetryErrorGroupDetailDtoSchema = telemetryErrorGroupDtoSchema.extend({
  fingerprint: z.string(),
  fingerprintVersion: z.number(),
  errorSignature: z.string(),
  firstRelease: z.string().nullable(),
  lastRelease: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  occurrences: z.array(telemetryErrorOccurrenceDtoSchema),
});

export const telemetryErrorGroupsListDtoSchema = z.array(telemetryErrorGroupDtoSchema);

export type TelemetryErrorGroupDto = z.infer<typeof telemetryErrorGroupDtoSchema>;
export type TelemetryErrorGroupDetailDto = z.infer<typeof telemetryErrorGroupDetailDtoSchema>;
export type TelemetryErrorOccurrenceDto = z.infer<typeof telemetryErrorOccurrenceDtoSchema>;
