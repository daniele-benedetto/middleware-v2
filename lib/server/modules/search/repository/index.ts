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
  total: number;
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
         COALESCE((SELECT MAX("updatedAt") FROM "questionnaires"), to_timestamp(0))
        ) AS "updatedAt",
        (SELECT COUNT(*) FROM "issues") +
        (SELECT COUNT(*) FROM "articles") +
        (SELECT COUNT(*) FROM "courses") +
        (SELECT COUNT(*) FROM "lessons") +
        (SELECT COUNT(*) FROM "pages") +
        (SELECT COUNT(*) FROM "maps") +
        (SELECT COUNT(*) FROM "map_items") +
        (SELECT COUNT(*) FROM "questionnaires") AS "count"
      `,
    );

    return `${record?.updatedAt?.toISOString() ?? ""}:${record?.count.toString() ?? "0"}`;
  },
  async getProjectionFingerprint() {
    const document = await prisma.globalSearchDocument.findFirst({
      select: { sourceFingerprint: true },
      orderBy: { updatedAt: "desc" },
    });

    return document?.sourceFingerprint ?? null;
  },
  async search(query: string, limit: number): Promise<SearchRecord[]> {
    return prisma.$queryRaw<SearchRecord[]>(Prisma.sql`
      WITH search_query AS (
        SELECT websearch_to_tsquery('italian', ${query}) AS value
      )
      SELECT
        document."id",
        document."sourceType",
        document."title",
        document."href",
        COUNT(*) OVER()::int AS "total",
        NULLIF(
          ts_headline(
            'italian',
            document."body",
            search_query.value,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=24, MinWords=12, MaxFragments=2'
          ),
          ''
        ) AS "snippet",
        document."publishedAt"
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
        NULL::text AS "snippet",
        document."publishedAt",
        COUNT(*) OVER()::int AS "total"
      FROM "global_search_documents" AS document
      INNER JOIN "article_popularities" AS popularity
        ON popularity."articleId" = document."sourceId"
      WHERE document."sourceType" = 'article'
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
        NULL::text AS "snippet",
        document."publishedAt",
        COUNT(*) OVER()::int AS "total"
      FROM "global_search_documents" AS document
      WHERE document."sourceType" = 'article'
      ORDER BY document."publishedAt" DESC NULLS LAST, document."title" ASC
      LIMIT ${limit}
    `);
  },
};
