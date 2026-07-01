-- Observability audit phase 6: replace technical audit logs with qualitative audit activities.
DROP TABLE IF EXISTS "audit_logs";
DROP TYPE IF EXISTS "AuditLogOutcome";

CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');
CREATE TYPE "AuditRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AuditChangeType" AS ENUM ('CREATED', 'UPDATED', 'REMOVED', 'REORDERED');

CREATE TABLE "audit_activities" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorSnapshot" JSONB,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "resourceSnapshot" JSONB,
  "outcome" "AuditOutcome" NOT NULL,
  "riskLevel" "AuditRiskLevel" NOT NULL,
  "riskReasons" JSONB,
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "beforeSummary" JSONB,
  "afterSummary" JSONB,
  "attemptedSummary" JSONB,
  "publicImpact" BOOLEAN NOT NULL DEFAULT false,
  "requestId" TEXT,
  "correlationId" TEXT,
  "reason" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_changes" (
  "id" TEXT NOT NULL,
  "auditActivityId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "beforeValueRedacted" JSONB,
  "afterValueRedacted" JSONB,
  "changeType" "AuditChangeType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_activities_createdAt_idx" ON "audit_activities"("createdAt");
CREATE INDEX "audit_activities_actorId_createdAt_idx" ON "audit_activities"("actorId", "createdAt");
CREATE INDEX "audit_activities_resourceType_resourceId_createdAt_idx" ON "audit_activities"("resourceType", "resourceId", "createdAt");
CREATE INDEX "audit_activities_outcome_createdAt_idx" ON "audit_activities"("outcome", "createdAt");
CREATE INDEX "audit_activities_riskLevel_createdAt_idx" ON "audit_activities"("riskLevel", "createdAt");
CREATE INDEX "audit_activities_publicImpact_createdAt_idx" ON "audit_activities"("publicImpact", "createdAt");
CREATE INDEX "audit_activities_requestId_idx" ON "audit_activities"("requestId");
CREATE INDEX "audit_activities_correlationId_idx" ON "audit_activities"("correlationId");
CREATE INDEX "audit_changes_auditActivityId_idx" ON "audit_changes"("auditActivityId");
CREATE INDEX "audit_changes_field_idx" ON "audit_changes"("field");

ALTER TABLE "audit_changes" ADD CONSTRAINT "audit_changes_auditActivityId_fkey" FOREIGN KEY ("auditActivityId") REFERENCES "audit_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
