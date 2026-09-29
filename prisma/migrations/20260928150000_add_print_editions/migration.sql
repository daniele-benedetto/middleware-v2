-- CreateEnum
CREATE TYPE "PrintEditionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'EXPORTED');

-- CreateTable
CREATE TABLE "print_editions" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PrintEditionStatus" NOT NULL DEFAULT 'DRAFT',
    "manifest" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_editions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "print_editions_issueId_updatedAt_idx" ON "print_editions"("issueId", "updatedAt");

-- CreateIndex
CREATE INDEX "print_editions_status_updatedAt_idx" ON "print_editions"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "print_editions" ADD CONSTRAINT "print_editions_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
