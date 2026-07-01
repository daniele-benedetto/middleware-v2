CREATE TYPE "ObservabilityJobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');
CREATE TYPE "ObservabilityAggregateDomain" AS ENUM ('CONTENT', 'ERRORS', 'PERFORMANCE', 'AUDIT', 'ALL');

CREATE TABLE "daily_content_quality_aggregates" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "pageType" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "totalVisits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "qualifiedVisits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completedReads" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "significantReturns" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recurringContentDays" INTEGER NOT NULL DEFAULT 0,
  "averageActiveTimeMs" INTEGER NOT NULL DEFAULT 0,
  "frustrationSignals" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "errorImpactedSessions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "poorPerformanceSessions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "qualityScore" INTEGER NOT NULL DEFAULT 0,
  "qualityScoreComponents" JSONB NOT NULL DEFAULT '{}',
  "sampleConfidence" TEXT NOT NULL DEFAULT 'low',
  "thresholdVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_content_quality_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_error_aggregates" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "source" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "impactArea" TEXT NOT NULL,
  "userImpact" TEXT NOT NULL,
  "release" TEXT NOT NULL,
  "newGroups" INTEGER NOT NULL DEFAULT 0,
  "openGroups" INTEGER NOT NULL DEFAULT 0,
  "criticalHighGroups" INTEGER NOT NULL DEFAULT 0,
  "regressions" INTEGER NOT NULL DEFAULT 0,
  "occurrences" INTEGER NOT NULL DEFAULT 0,
  "affectedSessions" INTEGER NOT NULL DEFAULT 0,
  "blockedActionGroups" INTEGER NOT NULL DEFAULT 0,
  "priorityScoreAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_error_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_performance_aggregates" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "pageType" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "deviceType" TEXT NOT NULL,
  "release" TEXT NOT NULL,
  "totalExperiences" INTEGER NOT NULL DEFAULT 0,
  "smoothCount" INTEGER NOT NULL DEFAULT 0,
  "acceptableCount" INTEGER NOT NULL DEFAULT 0,
  "frustratingCount" INTEGER NOT NULL DEFAULT 0,
  "brokenCount" INTEGER NOT NULL DEFAULT 0,
  "earlyExitCount" INTEGER NOT NULL DEFAULT 0,
  "lcpP75" DOUBLE PRECISION,
  "inpP75" DOUBLE PRECISION,
  "clsP75" DOUBLE PRECISION,
  "fcpP75" DOUBLE PRECISION,
  "ttfbP75" DOUBLE PRECISION,
  "poorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sampleConfidence" TEXT NOT NULL DEFAULT 'low',
  "thresholdVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_performance_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_audit_aggregates" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "resourceType" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "publicImpact" BOOLEAN NOT NULL,
  "activityCount" INTEGER NOT NULL DEFAULT 0,
  "highCriticalCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "sensitiveActionCount" INTEGER NOT NULL DEFAULT 0,
  "activeActorCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_audit_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "observability_job_runs" (
  "id" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "domain" "ObservabilityAggregateDomain" NOT NULL DEFAULT 'ALL',
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "status" "ObservabilityJobStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "lockedUntil" TIMESTAMP(3),
  "processedRows" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "observability_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_content_quality_aggregates_date_pageType_contentType_contentId_path_key" ON "daily_content_quality_aggregates"("date", "pageType", "contentType", "contentId", "path");
CREATE INDEX "daily_content_quality_aggregates_date_idx" ON "daily_content_quality_aggregates"("date");
CREATE INDEX "daily_content_quality_aggregates_pageType_date_idx" ON "daily_content_quality_aggregates"("pageType", "date");
CREATE INDEX "daily_content_quality_aggregates_contentType_contentId_date_idx" ON "daily_content_quality_aggregates"("contentType", "contentId", "date");
CREATE INDEX "daily_content_quality_aggregates_qualityScore_date_idx" ON "daily_content_quality_aggregates"("qualityScore", "date");
CREATE INDEX "daily_content_quality_aggregates_sampleConfidence_date_idx" ON "daily_content_quality_aggregates"("sampleConfidence", "date");

CREATE UNIQUE INDEX "daily_error_aggregates_date_source_severity_status_impactArea_userImpact_release_key" ON "daily_error_aggregates"("date", "source", "severity", "status", "impactArea", "userImpact", "release");
CREATE INDEX "daily_error_aggregates_date_idx" ON "daily_error_aggregates"("date");
CREATE INDEX "daily_error_aggregates_status_severity_date_idx" ON "daily_error_aggregates"("status", "severity", "date");
CREATE INDEX "daily_error_aggregates_impactArea_date_idx" ON "daily_error_aggregates"("impactArea", "date");
CREATE INDEX "daily_error_aggregates_release_date_idx" ON "daily_error_aggregates"("release", "date");

CREATE UNIQUE INDEX "daily_performance_aggregates_date_pageType_path_contentId_deviceType_release_key" ON "daily_performance_aggregates"("date", "pageType", "path", "contentId", "deviceType", "release");
CREATE INDEX "daily_performance_aggregates_date_idx" ON "daily_performance_aggregates"("date");
CREATE INDEX "daily_performance_aggregates_pageType_date_idx" ON "daily_performance_aggregates"("pageType", "date");
CREATE INDEX "daily_performance_aggregates_path_date_idx" ON "daily_performance_aggregates"("path", "date");
CREATE INDEX "daily_performance_aggregates_contentId_date_idx" ON "daily_performance_aggregates"("contentId", "date");
CREATE INDEX "daily_performance_aggregates_deviceType_date_idx" ON "daily_performance_aggregates"("deviceType", "date");
CREATE INDEX "daily_performance_aggregates_release_date_idx" ON "daily_performance_aggregates"("release", "date");
CREATE INDEX "daily_performance_aggregates_sampleConfidence_date_idx" ON "daily_performance_aggregates"("sampleConfidence", "date");

CREATE UNIQUE INDEX "daily_audit_aggregates_date_resourceType_action_outcome_riskLevel_publicImpact_key" ON "daily_audit_aggregates"("date", "resourceType", "action", "outcome", "riskLevel", "publicImpact");
CREATE INDEX "daily_audit_aggregates_date_idx" ON "daily_audit_aggregates"("date");
CREATE INDEX "daily_audit_aggregates_resourceType_date_idx" ON "daily_audit_aggregates"("resourceType", "date");
CREATE INDEX "daily_audit_aggregates_action_date_idx" ON "daily_audit_aggregates"("action", "date");
CREATE INDEX "daily_audit_aggregates_outcome_date_idx" ON "daily_audit_aggregates"("outcome", "date");
CREATE INDEX "daily_audit_aggregates_riskLevel_date_idx" ON "daily_audit_aggregates"("riskLevel", "date");
CREATE INDEX "daily_audit_aggregates_publicImpact_date_idx" ON "daily_audit_aggregates"("publicImpact", "date");

CREATE INDEX "observability_job_runs_jobName_status_lockedUntil_idx" ON "observability_job_runs"("jobName", "status", "lockedUntil");
CREATE INDEX "observability_job_runs_domain_windowStart_windowEnd_idx" ON "observability_job_runs"("domain", "windowStart", "windowEnd");
CREATE INDEX "observability_job_runs_startedAt_idx" ON "observability_job_runs"("startedAt");
