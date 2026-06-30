-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "country" TEXT,
    "visitorHash" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_vitals" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "rating" TEXT,
    "navigationType" TEXT,
    "path" TEXT NOT NULL,
    "visitorHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT,
    "message" TEXT NOT NULL,
    "digest" TEXT,
    "path" TEXT,
    "method" TEXT,
    "routePath" TEXT,
    "routeType" TEXT,
    "requestId" TEXT,
    "userAgent" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_daily_aggregates" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telemetry_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_vital_daily_aggregates" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "p50" DOUBLE PRECISION,
    "p75" DOUBLE PRECISION,
    "p95" DOUBLE PRECISION,
    "good" INTEGER NOT NULL DEFAULT 0,
    "needsImprovement" INTEGER NOT NULL DEFAULT 0,
    "poor" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_vital_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_event_createdAt_idx" ON "analytics_events"("event", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_path_createdAt_idx" ON "analytics_events"("path", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_visitorHash_createdAt_idx" ON "analytics_events"("visitorHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "web_vitals_metricId_name_key" ON "web_vitals"("metricId", "name");

-- CreateIndex
CREATE INDEX "web_vitals_createdAt_idx" ON "web_vitals"("createdAt");

-- CreateIndex
CREATE INDEX "web_vitals_name_createdAt_idx" ON "web_vitals"("name", "createdAt");

-- CreateIndex
CREATE INDEX "web_vitals_path_createdAt_idx" ON "web_vitals"("path", "createdAt");

-- CreateIndex
CREATE INDEX "web_vitals_path_name_createdAt_idx" ON "web_vitals"("path", "name", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "error_logs_fingerprint_key" ON "error_logs"("fingerprint");

-- CreateIndex
CREATE INDEX "error_logs_lastSeenAt_idx" ON "error_logs"("lastSeenAt");

-- CreateIndex
CREATE INDEX "error_logs_path_lastSeenAt_idx" ON "error_logs"("path", "lastSeenAt");

-- CreateIndex
CREATE INDEX "error_logs_source_lastSeenAt_idx" ON "error_logs"("source", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_daily_aggregates_date_event_path_referrer_country_key" ON "telemetry_daily_aggregates"("date", "event", "path", "referrer", "country");

-- CreateIndex
CREATE INDEX "telemetry_daily_aggregates_date_idx" ON "telemetry_daily_aggregates"("date");

-- CreateIndex
CREATE INDEX "telemetry_daily_aggregates_event_date_idx" ON "telemetry_daily_aggregates"("event", "date");

-- CreateIndex
CREATE INDEX "telemetry_daily_aggregates_path_date_idx" ON "telemetry_daily_aggregates"("path", "date");

-- CreateIndex
CREATE UNIQUE INDEX "web_vital_daily_aggregates_date_path_name_key" ON "web_vital_daily_aggregates"("date", "path", "name");

-- CreateIndex
CREATE INDEX "web_vital_daily_aggregates_date_idx" ON "web_vital_daily_aggregates"("date");

-- CreateIndex
CREATE INDEX "web_vital_daily_aggregates_name_date_idx" ON "web_vital_daily_aggregates"("name", "date");

-- CreateIndex
CREATE INDEX "web_vital_daily_aggregates_path_date_idx" ON "web_vital_daily_aggregates"("path", "date");
