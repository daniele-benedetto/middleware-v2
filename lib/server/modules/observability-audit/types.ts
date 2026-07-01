import type { Prisma } from "@/lib/generated/prisma/client";
import type { UserRole } from "@/lib/server/auth/roles";
import type {
  ObservabilityAuditAction,
  ObservabilityAuditChangeType,
  ObservabilityAuditResourceType,
} from "@/lib/server/modules/observability-audit/schema";

export type AuditActorSnapshot = {
  id: string | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
};

export type AuditSummary = {
  title: string;
  description: string | null;
  fields: Array<{ label: string; value: string }>;
  publicFlags: string[];
};

export type AuditSnapshot = AuditSummary & {
  values: Record<string, unknown>;
};

export type AuditChangeInput = {
  field: string;
  beforeValueRedacted: Prisma.InputJsonValue | null;
  afterValueRedacted: Prisma.InputJsonValue | null;
  changeType: ObservabilityAuditChangeType;
};

export type AuditActivityDescriptor = {
  action: ObservabilityAuditAction;
  resourceType: ObservabilityAuditResourceType;
  resourceId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export type AuditRequestContext = {
  requestId?: string | null;
  correlationId?: string | null;
  method?: string | null;
  path?: string | null;
};

export type RecordAuditSuccessInput = AuditActivityDescriptor & {
  actor: AuditActorSnapshot | null;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
  context: AuditRequestContext;
};

export type RecordAuditFailureInput = AuditActivityDescriptor & {
  actor: AuditActorSnapshot | null;
  before: AuditSnapshot | null;
  attempted: AuditSnapshot | null;
  context: AuditRequestContext;
  error: unknown;
};
