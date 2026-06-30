-- Drop legacy telemetry models. The project has no production telemetry history to preserve.
DROP TABLE IF EXISTS "web_vital_daily_aggregates";
DROP TABLE IF EXISTS "telemetry_daily_aggregates";
DROP TABLE IF EXISTS "error_logs";
DROP TABLE IF EXISTS "web_vitals";
DROP TABLE IF EXISTS "analytics_events";

-- CreateEnum
CREATE TYPE "ObservabilityEventCategory" AS ENUM ('ERROR');

-- CreateEnum
CREATE TYPE "ObservabilityErrorSource" AS ENUM ('SERVER', 'CLIENT', 'BOUNDARY');

-- CreateEnum
CREATE TYPE "ObservabilityErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ObservabilityErrorStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ObservabilityImpactArea" AS ENUM ('CMS', 'PUBLIC_SITE', 'AUTH', 'MEDIA', 'EDITORIAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ObservabilityUserImpact" AS ENUM ('NONE', 'MINOR', 'BLOCKED_ACTION', 'LOST_CONTENT');

-- CreateTable
CREATE TABLE "observability_sessions" (
    "id" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "landingPath" TEXT,
    "exitPath" TEXT,
    "referrerDomain" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "isLikelyBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observability_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observability_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "visitorHash" TEXT,
    "type" TEXT NOT NULL,
    "category" "ObservabilityEventCategory" NOT NULL,
    "path" TEXT,
    "pageType" TEXT,
    "contentId" TEXT,
    "contentType" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "release" TEXT,
    "sampleRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "clientSequence" INTEGER,
    "clientElapsedMs" INTEGER,
    "metadata" JSONB,
    "receivedAtServer" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observability_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_groups" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "fingerprintVersion" INTEGER NOT NULL,
    "errorSignature" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" "ObservabilityErrorSource" NOT NULL,
    "severity" "ObservabilityErrorSeverity" NOT NULL,
    "status" "ObservabilityErrorStatus" NOT NULL DEFAULT 'OPEN',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "affectedSessions" INTEGER NOT NULL DEFAULT 0,
    "affectedPaths" JSONB NOT NULL DEFAULT '[]',
    "impactArea" "ObservabilityImpactArea" NOT NULL DEFAULT 'UNKNOWN',
    "userImpact" "ObservabilityUserImpact" NOT NULL DEFAULT 'NONE',
    "regression" BOOLEAN NOT NULL DEFAULT false,
    "firstRelease" TEXT,
    "lastRelease" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "error_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_occurrences" (
    "id" TEXT NOT NULL,
    "errorGroupId" TEXT NOT NULL,
    "observabilityEventId" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "path" TEXT,
    "routePath" TEXT,
    "routeType" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "actionContext" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "stackTraceRedacted" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observability_sessions_visitorHash_startedAt_idx" ON "observability_sessions"("visitorHash", "startedAt");

-- CreateIndex
CREATE INDEX "observability_sessions_startedAt_idx" ON "observability_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "observability_sessions_lastSeenAt_idx" ON "observability_sessions"("lastSeenAt");

-- CreateIndex
CREATE INDEX "observability_events_receivedAtServer_idx" ON "observability_events"("receivedAtServer");

-- CreateIndex
CREATE INDEX "observability_events_sessionId_receivedAtServer_idx" ON "observability_events"("sessionId", "receivedAtServer");

-- CreateIndex
CREATE INDEX "observability_events_requestId_idx" ON "observability_events"("requestId");

-- CreateIndex
CREATE INDEX "observability_events_category_receivedAtServer_idx" ON "observability_events"("category", "receivedAtServer");

-- CreateIndex
CREATE UNIQUE INDEX "error_groups_fingerprint_key" ON "error_groups"("fingerprint");

-- CreateIndex
CREATE INDEX "error_groups_errorSignature_idx" ON "error_groups"("errorSignature");

-- CreateIndex
CREATE INDEX "error_groups_status_severity_lastSeenAt_idx" ON "error_groups"("status", "severity", "lastSeenAt");

-- CreateIndex
CREATE INDEX "error_groups_source_lastSeenAt_idx" ON "error_groups"("source", "lastSeenAt");

-- CreateIndex
CREATE INDEX "error_groups_impactArea_lastSeenAt_idx" ON "error_groups"("impactArea", "lastSeenAt");

-- CreateIndex
CREATE INDEX "error_occurrences_errorGroupId_occurredAt_idx" ON "error_occurrences"("errorGroupId", "occurredAt");

-- CreateIndex
CREATE INDEX "error_occurrences_sessionId_occurredAt_idx" ON "error_occurrences"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "error_occurrences_requestId_idx" ON "error_occurrences"("requestId");

-- CreateIndex
CREATE INDEX "error_occurrences_occurredAt_idx" ON "error_occurrences"("occurredAt");

-- AddForeignKey
ALTER TABLE "observability_events" ADD CONSTRAINT "observability_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "observability_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_errorGroupId_fkey" FOREIGN KEY ("errorGroupId") REFERENCES "error_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_observabilityEventId_fkey" FOREIGN KEY ("observabilityEventId") REFERENCES "observability_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "observability_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
