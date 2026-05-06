import { z } from "zod";

import { auditLogOutcomeValues, auditLogResourceValues } from "@/lib/audit-logs/constants";

export const auditLogDtoSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  actorDisplayName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  actorRole: z.enum(["ADMIN", "EDITOR"]).nullable(),
  action: z.string(),
  resource: z.enum(auditLogResourceValues),
  resourceId: z.string().nullable(),
  outcome: z.enum(auditLogOutcomeValues),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  method: z.string(),
  path: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  requestId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
});

export const auditLogResourceFieldDtoSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const auditLogResourceSummaryDtoSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  missing: z.boolean(),
  fields: z.array(auditLogResourceFieldDtoSchema),
});

export const auditLogDetailDtoSchema = auditLogDtoSchema.extend({
  resourceSummary: auditLogResourceSummaryDtoSchema.nullable(),
});

export const auditLogsListDtoSchema = z.array(auditLogDtoSchema);

export type AuditLogDto = z.infer<typeof auditLogDtoSchema>;
export type AuditLogDetailDto = z.infer<typeof auditLogDetailDtoSchema>;
