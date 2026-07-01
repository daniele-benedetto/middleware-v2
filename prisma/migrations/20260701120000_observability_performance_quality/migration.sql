-- Fase 5: performance qualitativa, senza mapping da Web Vitals legacy o FID.

ALTER TYPE "ObservabilityEventCategory" ADD VALUE 'PERFORMANCE';

CREATE TABLE "performance_experiences" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "visitorHash" TEXT,
  "observabilityEventId" TEXT,
  "pageInstanceId" TEXT,
  "path" TEXT NOT NULL,
  "routePath" TEXT,
  "pageType" TEXT NOT NULL,
  "contentId" TEXT,
  "deviceType" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "connectionType" TEXT,
  "effectiveConnectionType" TEXT,
  "saveData" BOOLEAN,
  "viewportWidth" INTEGER,
  "viewportHeight" INTEGER,
  "lcp" DOUBLE PRECISION,
  "inp" DOUBLE PRECISION,
  "cls" DOUBLE PRECISION,
  "fcp" DOUBLE PRECISION,
  "ttfb" DOUBLE PRECISION,
  "rating" TEXT NOT NULL,
  "perceivedQuality" TEXT NOT NULL,
  "causedEarlyExit" BOOLEAN NOT NULL DEFAULT false,
  "activeTimeMs" INTEGER,
  "exitType" TEXT,
  "hasBlockingError" BOOLEAN NOT NULL DEFAULT false,
  "correlatedErrorCount" INTEGER NOT NULL DEFAULT 0,
  "qualityReasons" JSONB NOT NULL DEFAULT '[]',
  "release" TEXT,
  "thresholdVersion" TEXT NOT NULL,
  "sampleRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "performance_experiences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "performance_experiences"
  ADD CONSTRAINT "performance_experiences_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "observability_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "performance_experiences"
  ADD CONSTRAINT "performance_experiences_observabilityEventId_fkey"
  FOREIGN KEY ("observabilityEventId") REFERENCES "observability_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "performance_experiences_sessionId_occurredAt_idx" ON "performance_experiences"("sessionId", "occurredAt");
CREATE INDEX "performance_experiences_sessionId_pageInstanceId_path_idx" ON "performance_experiences"("sessionId", "pageInstanceId", "path");
CREATE INDEX "performance_experiences_pageInstanceId_occurredAt_idx" ON "performance_experiences"("pageInstanceId", "occurredAt");
CREATE INDEX "performance_experiences_path_occurredAt_idx" ON "performance_experiences"("path", "occurredAt");
CREATE INDEX "performance_experiences_pageType_occurredAt_idx" ON "performance_experiences"("pageType", "occurredAt");
CREATE INDEX "performance_experiences_contentId_occurredAt_idx" ON "performance_experiences"("contentId", "occurredAt");
CREATE INDEX "performance_experiences_deviceType_occurredAt_idx" ON "performance_experiences"("deviceType", "occurredAt");
CREATE INDEX "performance_experiences_rating_occurredAt_idx" ON "performance_experiences"("rating", "occurredAt");
CREATE INDEX "performance_experiences_perceivedQuality_occurredAt_idx" ON "performance_experiences"("perceivedQuality", "occurredAt");
CREATE INDEX "performance_experiences_release_occurredAt_idx" ON "performance_experiences"("release", "occurredAt");
