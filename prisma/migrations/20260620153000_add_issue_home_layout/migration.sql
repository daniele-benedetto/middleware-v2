CREATE TYPE "IssueHomeLayout" AS ENUM ('DOSSIER');

ALTER TABLE "issues" ADD COLUMN "homeLayout" "IssueHomeLayout" NOT NULL DEFAULT 'DOSSIER';
