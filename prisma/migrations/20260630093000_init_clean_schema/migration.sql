-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditLogOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bioRich" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleStyled" JSONB,
    "slug" TEXT NOT NULL,
    "description" JSONB,
    "homeBlocks" JSONB,
    "homeVariant" TEXT NOT NULL DEFAULT 'black',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "titleStyled" JSONB,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "excerptRich" JSONB,
    "contentRich" JSONB NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "audioUrl" TEXT,
    "audioChunks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tags" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleStyled" JSONB,
    "slug" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "excerpt" TEXT,
    "excerptRich" JSONB,
    "contentRich" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menus" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" "UserRole",
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "outcome" "AuditLogOutcome" NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE INDEX "authors_isActive_idx" ON "authors"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "issues_slug_key" ON "issues"("slug");

-- CreateIndex
CREATE INDEX "issues_isActive_sortOrder_idx" ON "issues"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "issues_publishedAt_idx" ON "issues"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_isActive_idx" ON "tags"("isActive");

-- CreateIndex
CREATE INDEX "articles_slug_idx" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_issueId_publishedAt_idx" ON "articles"("issueId", "publishedAt");

-- CreateIndex
CREATE INDEX "articles_categoryId_idx" ON "articles"("categoryId");

-- CreateIndex
CREATE INDEX "articles_authorId_idx" ON "articles"("authorId");

-- CreateIndex
CREATE INDEX "articles_status_publishedAt_idx" ON "articles"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "articles_status_isFeatured_idx" ON "articles"("status", "isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "articles_issueId_slug_key" ON "articles"("issueId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "article_tags_tagId_idx" ON "article_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_status_publishedAt_idx" ON "pages"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_menus_key_key" ON "navigation_menus"("key");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_createdAt_idx" ON "audit_logs"("resource", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_outcome_createdAt_idx" ON "audit_logs"("outcome", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
