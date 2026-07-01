-- Fase 4: errori operativi, senza backfill da ErrorLog o conteggi legacy.

ALTER TABLE "error_groups"
  ADD COLUMN "priorityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priorityReasons" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "reopenedAt" TIMESTAMP(3),
  ADD COLUMN "reopenedBy" TEXT,
  ADD COLUMN "lastStatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastStatusBy" TEXT;

CREATE INDEX "error_groups_priorityScore_lastSeenAt_idx" ON "error_groups"("priorityScore", "lastSeenAt");
CREATE INDEX "error_groups_regression_lastSeenAt_idx" ON "error_groups"("regression", "lastSeenAt");
CREATE INDEX "error_groups_lastRelease_lastSeenAt_idx" ON "error_groups"("lastRelease", "lastSeenAt");
