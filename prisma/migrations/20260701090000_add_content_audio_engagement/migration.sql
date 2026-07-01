-- Fase 3: engagement interpretato dei contenuti, senza backfill da analytics legacy.

CREATE TABLE "content_engagements" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" TEXT,
  "visitorHash" TEXT,
  "contentType" TEXT,
  "contentId" TEXT,
  "slug" TEXT,
  "path" TEXT NOT NULL,
  "pageType" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "activeTimeMs" INTEGER NOT NULL DEFAULT 0,
  "maxScrollDepth" INTEGER NOT NULL DEFAULT 0,
  "scrollMilestones" JSONB NOT NULL DEFAULT '[]',
  "interactionCount" INTEGER NOT NULL DEFAULT 0,
  "returnCountInSession" INTEGER NOT NULL DEFAULT 0,
  "refreshCount" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "engagementLevel" TEXT NOT NULL DEFAULT 'glance',
  "exitType" TEXT NOT NULL DEFAULT 'unknown',
  "sampleRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "content_engagements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audio_engagements" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" TEXT,
  "visitorHash" TEXT,
  "articleId" TEXT,
  "path" TEXT NOT NULL,
  "started" BOOLEAN NOT NULL DEFAULT false,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "listenedMs" INTEGER NOT NULL DEFAULT 0,
  "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "seekCount" INTEGER NOT NULL DEFAULT 0,
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "audio_engagements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_engagements_sessionId_path_contentId_key" ON "content_engagements"("sessionId", "path", "contentId");
CREATE INDEX "content_engagements_sessionId_path_idx" ON "content_engagements"("sessionId", "path");
CREATE INDEX "content_engagements_sessionId_contentId_idx" ON "content_engagements"("sessionId", "contentId");
CREATE INDEX "content_engagements_contentType_contentId_firstSeenAt_idx" ON "content_engagements"("contentType", "contentId", "firstSeenAt");
CREATE INDEX "content_engagements_pageType_firstSeenAt_idx" ON "content_engagements"("pageType", "firstSeenAt");
CREATE INDEX "content_engagements_engagementLevel_firstSeenAt_idx" ON "content_engagements"("engagementLevel", "firstSeenAt");
CREATE INDEX "content_engagements_completed_firstSeenAt_idx" ON "content_engagements"("completed", "firstSeenAt");

CREATE UNIQUE INDEX "audio_engagements_sessionId_articleId_path_key" ON "audio_engagements"("sessionId", "articleId", "path");
CREATE INDEX "audio_engagements_sessionId_articleId_idx" ON "audio_engagements"("sessionId", "articleId");
CREATE INDEX "audio_engagements_articleId_firstSeenAt_idx" ON "audio_engagements"("articleId", "firstSeenAt");
CREATE INDEX "audio_engagements_completed_firstSeenAt_idx" ON "audio_engagements"("completed", "firstSeenAt");

ALTER TABLE "content_engagements"
  ADD CONSTRAINT "content_engagements_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "observability_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audio_engagements"
  ADD CONSTRAINT "audio_engagements_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "observability_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
