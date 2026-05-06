import type { AuditLogOutcomeValue } from "@/lib/audit-logs/constants";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { UserRole } from "@/lib/server/auth/roles";

export type AuditLogEntryOutcome = AuditLogOutcomeValue;

export type CreateAuditLogEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: UserRole | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  outcome: AuditLogEntryOutcome;
  errorCode?: string | null;
  errorMessage?: string | null;
  method: string;
  path: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Prisma.InputJsonValue;
};
