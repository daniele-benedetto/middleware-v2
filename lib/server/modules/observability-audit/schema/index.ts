import { z } from "zod";

import { auditOutcomeValues, auditRiskLevelValues } from "@/lib/server/modules/observability/model";

export const observabilityAuditChangeTypeValues = [
  "created",
  "updated",
  "removed",
  "reordered",
] as const;
export const observabilityAuditResourceTypeValues = [
  "article",
  "author",
  "category",
  "issue",
  "media",
  "navigation",
  "page",
  "tag",
  "user",
  "unknown",
] as const;
export const observabilityAuditActionValues = [
  "create",
  "update",
  "publish",
  "unpublish",
  "archive",
  "delete",
  "restore",
  "reorder",
  "sync_tags",
  "upload",
  "remove_media",
  "update_navigation",
  "change_role",
  "feature",
  "unfeature",
  "unknown",
] as const;

export const observabilityAuditOutcomeSchema = z.enum(auditOutcomeValues);
export const observabilityAuditRiskLevelSchema = z.enum(auditRiskLevelValues);
export const observabilityAuditChangeTypeSchema = z.enum(observabilityAuditChangeTypeValues);
export const observabilityAuditResourceTypeSchema = z.enum(observabilityAuditResourceTypeValues);
export const observabilityAuditActionSchema = z.enum(observabilityAuditActionValues);

const nullableTextSchema = z.string().trim().min(1).max(240).optional().nullable();

export const listObservabilityAuditQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  resourceType: observabilityAuditResourceTypeSchema.optional(),
  action: observabilityAuditActionSchema.optional(),
  outcome: observabilityAuditOutcomeSchema.optional(),
  riskLevel: observabilityAuditRiskLevelSchema.optional(),
  publicImpact: z.boolean().optional(),
  requestId: z.string().trim().min(1).max(240).optional(),
  correlationId: z.string().trim().min(1).max(240).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "riskLevel", "outcome", "publicImpact"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const observabilityAuditIdInputSchema = z.object({
  id: z.string().uuid(),
});

export type ObservabilityAuditOutcome = z.infer<typeof observabilityAuditOutcomeSchema>;
export type ObservabilityAuditRiskLevel = z.infer<typeof observabilityAuditRiskLevelSchema>;
export type ObservabilityAuditChangeType = z.infer<typeof observabilityAuditChangeTypeSchema>;
export type ObservabilityAuditResourceType = z.infer<typeof observabilityAuditResourceTypeSchema>;
export type ObservabilityAuditAction = z.infer<typeof observabilityAuditActionSchema>;
export type ListObservabilityAuditQuery = z.infer<typeof listObservabilityAuditQuerySchema>;

export const auditRecordContextSchema = z.object({
  requestId: nullableTextSchema,
  correlationId: nullableTextSchema,
  method: nullableTextSchema,
  path: nullableTextSchema,
});

export type AuditRecordContext = z.infer<typeof auditRecordContextSchema>;
