-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionRich" JSONB,
    "definition" JSONB NOT NULL,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_responses" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "definitionSnapshot" JSONB NOT NULL,
    "anonymousTokenHash" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaires_slug_key" ON "questionnaires"("slug");

-- CreateIndex
CREATE INDEX "questionnaires_status_publishedAt_idx" ON "questionnaires"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "questionnaires_closedAt_idx" ON "questionnaires"("closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_responses_questionnaireId_anonymousTokenHash_key" ON "questionnaire_responses"("questionnaireId", "anonymousTokenHash");

-- CreateIndex
CREATE INDEX "questionnaire_responses_questionnaireId_submittedAt_idx" ON "questionnaire_responses"("questionnaireId", "submittedAt");

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
