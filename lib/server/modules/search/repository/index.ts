import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type SearchRecord = {
  id: string;
  sourceType: string;
  title: string;
  href: string;
  snippet: string | null;
  publishedAt: Date | null;
  context: string | null;
  meta: string[];
  total: number;
};

const PROJECTION_VERSION = "5";

export type ProjectionDocumentInput = {
  id: string;
  sourceType: "article" | "course" | "lesson" | "page" | "map" | "questionnaire";
  sourceId: string;
  title: string;
  body: string;
  href: string;
  publishedAt: Date | null;
  context: string | null;
  meta: string[];
};

export const searchRepository = {
  async count() {
    return prisma.globalSearchDocument.count();
  },
  async getSourceFingerprint() {
    const [record] = await prisma.$queryRaw<Array<{ updatedAt: Date | null; count: bigint }>>(
      Prisma.sql`
      SELECT
        GREATEST(
         COALESCE((SELECT MAX("updatedAt") FROM "issues"), to_timestamp(0)),
         COALESCE((SELECT MAX("updatedAt") FROM "articles"), to_timestamp(0)),
         COALESCE((SELECT MAX("updatedAt") FROM "courses"), to_timestamp(0)),
        COALESCE((SELECT MAX("updatedAt") FROM "lessons"), to_timestamp(0)),
        COALESCE((SELECT MAX("updatedAt") FROM "pages"), to_timestamp(0)),
        COALESCE((SELECT MAX("updatedAt") FROM "maps"), to_timestamp(0)),
        COALESCE((SELECT MAX("updatedAt") FROM "map_items"), to_timestamp(0)),
         COALESCE((SELECT MAX("updatedAt") FROM "questionnaires"), to_timestamp(0)),
         COALESCE((SELECT MAX("updatedAt") FROM "categories"), to_timestamp(0)),
         COALESCE((SELECT MAX("updatedAt") FROM "authors"), to_timestamp(0))
        ) AS "updatedAt",
        (SELECT COUNT(*) FROM "issues") +
        (SELECT COUNT(*) FROM "articles") +
        (SELECT COUNT(*) FROM "courses") +
        (SELECT COUNT(*) FROM "lessons") +
        (SELECT COUNT(*) FROM "pages") +
        (SELECT COUNT(*) FROM "maps") +
        (SELECT COUNT(*) FROM "map_items") +
        (SELECT COUNT(*) FROM "questionnaires") +
        (SELECT COUNT(*) FROM "categories") +
        (SELECT COUNT(*) FROM "authors") AS "count"
      `,
    );

    return `v${PROJECTION_VERSION}:${record?.updatedAt?.toISOString() ?? ""}:${record?.count.toString() ?? "0"}`;
  },
  async getProjectionFingerprint() {
    const document = await prisma.globalSearchDocument.findFirst({
      select: { sourceFingerprint: true },
      orderBy: { updatedAt: "desc" },
    });

    return document?.sourceFingerprint ?? null;
  },
  async replaceProjection(documents: ProjectionDocumentInput[], sourceFingerprint: string) {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('global_search_projection'))`,
        );

        const current = await tx.globalSearchDocument.findFirst({
          select: { sourceFingerprint: true },
          orderBy: { updatedAt: "desc" },
        });
        if (current?.sourceFingerprint === sourceFingerprint) {
          return false;
        }

        await tx.globalSearchDocument.deleteMany();
        await tx.globalSearchDocument.createMany({
          data: documents.map((document) => ({ ...document, sourceFingerprint })),
        });
        return true;
      },
      { maxWait: 30_000, timeout: 60_000 },
    );
  },
  async search(tsQuery: string, limit: number): Promise<SearchRecord[]> {
    return prisma.$queryRaw<SearchRecord[]>(Prisma.sql`
      WITH search_query AS (
        SELECT to_tsquery('italian', ${tsQuery}) AS value
      )
      SELECT
        document."id",
        document."sourceType",
        document."title",
        document."href",
        COUNT(*) OVER()::int AS "total",
        left(document."body", 1000) AS "snippet",
        document."publishedAt",
        document."context",
        document."meta"
      FROM "global_search_documents" AS document
      CROSS JOIN search_query
      WHERE document."searchVector" @@ search_query.value
      ORDER BY
        ts_rank_cd(document."searchVector", search_query.value, 32) DESC,
        document."publishedAt" DESC NULLS LAST,
        document."title" ASC
      LIMIT ${limit}
    `);
  },
  async listSuggestedArticles(limit: number): Promise<SearchRecord[]> {
    return prisma.$queryRaw<SearchRecord[]>(Prisma.sql`
      SELECT
        document."id",
        document."sourceType",
        document."title",
        document."href",
        left(document."body", 1000) AS "snippet",
        document."publishedAt",
        document."context",
        document."meta",
        COUNT(*) OVER()::int AS "total"
      FROM "global_search_documents" AS document
      INNER JOIN "article_popularities" AS popularity
        ON popularity."articleId" = document."sourceId"
      INNER JOIN "articles" AS article
        ON article."id" = popularity."articleId"
      WHERE document."sourceType" = 'article'
        AND article."status" = 'PUBLISHED'
        AND article."publishedAt" IS NOT NULL
        AND popularity."syncedAt" >= NOW() - INTERVAL '2 days'
      ORDER BY
        popularity."pageviews" DESC,
        document."publishedAt" DESC NULLS LAST,
        document."title" ASC
      LIMIT ${limit}
    `);
  },
  async listLatestArticles(limit: number): Promise<SearchRecord[]> {
    return prisma.$queryRaw<SearchRecord[]>(Prisma.sql`
      SELECT
        document."id",
        document."sourceType",
        document."title",
        document."href",
        left(document."body", 1000) AS "snippet",
        document."publishedAt",
        document."context",
        document."meta",
        COUNT(*) OVER()::int AS "total"
      FROM "global_search_documents" AS document
      INNER JOIN "articles" AS article
        ON article."id" = document."sourceId"
      WHERE document."sourceType" = 'article'
        AND article."status" = 'PUBLISHED'
        AND article."publishedAt" IS NOT NULL
      ORDER BY document."publishedAt" DESC NULLS LAST, document."title" ASC
      LIMIT ${limit}
    `);
  },
};
