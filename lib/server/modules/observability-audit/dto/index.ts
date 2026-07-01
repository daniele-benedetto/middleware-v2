import { z } from "zod";

import {
  observabilityAuditActionSchema,
  observabilityAuditChangeTypeSchema,
  observabilityAuditOutcomeSchema,
  observabilityAuditResourceTypeSchema,
  observabilityAuditRiskLevelSchema,
} from "@/lib/server/modules/observability-audit/schema";

const actorSnapshotSchema = z
  .object({
    id: z.string().nullable(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    role: z.string().nullable(),
  })
  .nullable();

const resourceSummaryFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const resourceSummarySchema = z
  .object({
    title: z.string(),
    description: z.string().nullable(),
    fields: z.array(resourceSummaryFieldSchema),
    publicFlags: z.array(z.string()),
  })
  .nullable();

export const observabilityAuditSummaryDtoSchema = z.object({
  highRiskCount: z.number().int().nonnegative(),
  publicImpactCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  activeActorCount: z.number().int().nonnegative(),
  sensitiveActionCount: z.number().int().nonnegative(),
});

export const observabilityAuditActivityDtoSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().nullable(),
  actorDisplayName: z.string().nullable(),
  action: observabilityAuditActionSchema,
  resourceType: observabilityAuditResourceTypeSchema,
  resourceId: z.string().nullable(),
  resourceTitle: z.string().nullable(),
  outcome: observabilityAuditOutcomeSchema,
  riskLevel: observabilityAuditRiskLevelSchema,
  riskReasons: z.array(z.string()),
  publicImpact: z.boolean(),
  changedFields: z.array(z.string()),
  requestId: z.string().nullable(),
  correlationId: z.string().nullable(),
  errorCode: z.string().nullable(),
  createdAt: z.string(),
});

export const observabilityAuditChangeDtoSchema = z.object({
  id: z.string().uuid(),
  field: z.string(),
  beforeValueRedacted: z.unknown().nullable(),
  afterValueRedacted: z.unknown().nullable(),
  changeType: observabilityAuditChangeTypeSchema,
  createdAt: z.string(),
});

export const observabilityAuditRelatedErrorDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  severity: z.string(),
  status: z.string(),
  lastSeenAt: z.string(),
});

export const observabilityAuditActivityDetailDtoSchema = observabilityAuditActivityDtoSchema.extend(
  {
    actorSnapshot: actorSnapshotSchema,
    resourceSnapshot: z.unknown().nullable(),
    beforeSummary: resourceSummarySchema,
    afterSummary: resourceSummarySchema,
    attemptedSummary: resourceSummarySchema,
    reason: z.string().nullable(),
    errorMessage: z.string().nullable(),
    metadata: z.unknown().nullable(),
    changes: z.array(observabilityAuditChangeDtoSchema),
    relatedErrors: z.array(observabilityAuditRelatedErrorDtoSchema),
  },
);

export const observabilityAuditActivitiesListDtoSchema = z.array(
  observabilityAuditActivityDtoSchema,
);

export type ObservabilityAuditSummaryDto = z.infer<typeof observabilityAuditSummaryDtoSchema>;
export type ObservabilityAuditActivityDto = z.infer<typeof observabilityAuditActivityDtoSchema>;
export type ObservabilityAuditActivityDetailDto = z.infer<
  typeof observabilityAuditActivityDetailDtoSchema
>;
