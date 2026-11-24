import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { i18n } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { issueHomeBlocksSchema } from "@/lib/server/modules/issues/schema";
import { articleSearchMeta } from "@/lib/server/modules/search/projection/article-meta";
import { questionnaireSearchText } from "@/lib/server/modules/search/projection/questionnaire-text";
import { toPrefixTsQuery } from "@/lib/server/modules/search/query/prefix-tsquery";
import { searchRepository } from "@/lib/server/modules/search/repository";
import { bodyExcerpt } from "@/lib/server/modules/search/service/body-excerpt";
import { createSingleFlightThrottle } from "@/lib/server/modules/search/service/single-flight-throttle";

import type { PublicSearchResultDto } from "@/lib/server/modules/search/dto";
import type { ProjectionDocumentInput as ProjectionDocument } from "@/lib/server/modules/search/repository";

const PROJECTION_CHECK_INTERVAL_MS = 15_000;

function richText(value: unknown) {
  return extractPlainText(value) ?? "";
}

function publicBlocks(value: unknown) {
  const parsed = issueHomeBlocksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function documentId(sourceType: ProjectionDocument["sourceType"], sourceId: string, href: string) {
  return `${sourceType}:${sourceId}:${href}`;
}

type SearchRecord = Awaited<ReturnType<typeof searchRepository.search>>[number];

const searchContext = i18n.public.home.dossier.searchContext;

function toResult(record: SearchRecord): PublicSearchResultDto {
  return {
    id: record.id,
    type: record.sourceType as PublicSearchResultDto["type"],
    title: record.title,
    href: record.href,
    snippet: bodyExcerpt(record.snippet),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    context: record.context,
    meta: record.meta,
  };
}

export const publicSearchService = {
  async search(query: string, limit: number) {
    const tsQuery = toPrefixTsQuery(query);
    if (!tsQuery) return { total: 0, items: [] };

    await ensureGlobalSearchProjection();

    const records = await searchRepository.search(tsQuery, limit);
    return {
      total: records[0]?.total ?? 0,
      items: records.map(toResult),
    };
  },
  async suggestions(limit: number) {
    await ensureGlobalSearchProjection();

    const popularRecords = await getPopularRecords(limit);
    const records =
      popularRecords.length > 0 ? popularRecords : await searchRepository.listLatestArticles(limit);

    return {
      source: popularRecords.length > 0 ? "popular" : "latest",
      items: records.map(toResult),
    };
  },
};

async function getPopularRecords(limit: number) {
  try {
    return await searchRepository.listSuggestedArticles(limit);
  } catch (error) {
    if (isMissingPopularityTableError(error)) return [];
    throw error;
  }
}

function isMissingPopularityTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2021") return true;

  return error.code === "P2010" && containsMissingTableMarker(error.meta);
}

function containsMissingTableMarker(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      value === "42P01" ||
      value === "TableDoesNotExist" ||
      value.includes("relation does not exist")
    );
  }
  if (!value || typeof value !== "object") return false;

  return Object.values(value).some(containsMissingTableMarker);
}

async function syncGlobalSearchProjection() {
  const [documents, sourceFingerprint, projectionFingerprint] = await Promise.all([
    searchRepository.count(),
    searchRepository.getSourceFingerprint(),
    searchRepository.getProjectionFingerprint(),
  ]);

  if (documents === 0 || sourceFingerprint !== projectionFingerprint) {
    await rebuildGlobalSearchProjection(sourceFingerprint);
  }
}

const ensureGlobalSearchProjection = createSingleFlightThrottle(
  syncGlobalSearchProjection,
  PROJECTION_CHECK_INTERVAL_MS,
);

export async function rebuildGlobalSearchProjection(sourceFingerprint?: string) {
  const [issues, articles, courses, lessons, pages, maps, questionnaires] = await Promise.all([
    prisma.issue.findMany({
      select: { id: true, slug: true, isActive: true, publishedAt: true, homeBlocks: true },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      select: {
        id: true,
        issueId: true,
        slug: true,
        title: true,
        excerpt: true,
        excerptRich: true,
        contentRich: true,
        publishedAt: true,
        audioUrl: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.course.findMany({
      where: { isActive: true, publishedAt: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        publishedAt: true,
        _count: {
          select: { lessons: { where: { status: "PUBLISHED", publishedAt: { not: null } } } },
        },
      },
    }),
    prisma.lesson.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        course: { isActive: true, publishedAt: { not: null } },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        excerptRich: true,
        contentRich: true,
        publishedAt: true,
        course: { select: { slug: true, title: true } },
      },
    }),
    prisma.page.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        excerptRich: true,
        contentRich: true,
        publishedAt: true,
      },
    }),
    prisma.map.findMany({
      where: { isActive: true, publishedAt: { not: null } },
      select: {
        id: true,
        title: true,
        descriptionRich: true,
        publishedAt: true,
        items: { select: { title: true, descriptionRich: true } },
      },
    }),
    prisma.questionnaire.findMany({
      where: { status: { in: ["PUBLISHED", "CLOSED"] } },
      select: {
        id: true,
        slug: true,
        title: true,
        descriptionRich: true,
        definition: true,
        status: true,
        publishedAt: true,
      },
    }),
  ]);

  const documents: ProjectionDocument[] = [];
  const publicIssues = issues.filter((issue) => issue.isActive && issue.publishedAt);
  const issuePositions = new Map(
    publicIssues
      .toSorted((a, b) => (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0))
      .map((issue, index) => [issue.id, index]),
  );
  const issuePosition = (issueId: string) => issuePositions.get(issueId) ?? publicIssues.length;
  const issueNumberLabel = (issueId: string) => searchContext.issue(issuePosition(issueId));
  const publicIssueIds = new Set(publicIssues.map((issue) => issue.id));
  const articleById = new Map(articles.map((article) => [article.id, article]));
  const visibleArticleIds = new Set(
    articles.filter((article) => publicIssueIds.has(article.issueId)).map((article) => article.id),
  );

  for (const hostIssue of publicIssues) {
    for (const block of publicBlocks(hostIssue.homeBlocks)) {
      if (block.type !== "preview" || !block.previewIssueId) continue;
      const previewIssue = issues.find((issue) => issue.id === block.previewIssueId);
      if (!previewIssue) continue;
      const previewBlocks = publicBlocks(previewIssue.homeBlocks);
      const ordered = [
        ...previewBlocks
          .filter((block) => block.type === "opening")
          .flatMap((block) => (block.type === "opening" ? block.articleIds : [])),
        ...previewBlocks
          .filter(
            (block) =>
              block.type !== "opening" &&
              block.type !== "course" &&
              block.type !== "map" &&
              block.type !== "questionnaireAnalysis" &&
              block.type !== "questionnaireInvite" &&
              block.type !== "preview",
          )
          .flatMap((block) => ("articleIds" in block ? block.articleIds : [])),
      ];
      const selected = ordered.find((id) => articleById.has(id));
      if (selected) visibleArticleIds.add(selected);
    }
  }

  for (const article of articles) {
    if (!visibleArticleIds.has(article.id)) continue;
    documents.push({
      id: documentId("article", article.id, `/articoli/${article.slug}`),
      sourceType: "article",
      sourceId: article.id,
      title: article.title,
      body: [article.excerpt ?? richText(article.excerptRich), richText(article.contentRich)]
        .filter(Boolean)
        .join(" "),
      href: `/articoli/${article.slug}`,
      publishedAt: article.publishedAt,
      context: issueNumberLabel(article.issueId),
      meta: articleSearchMeta({
        categoryName: article.category.name,
        authorName: article.author?.name ?? null,
        publishedAt: article.publishedAt,
        hasAudio: Boolean(article.audioUrl),
      }),
    });
  }
  for (const course of courses) {
    documents.push({
      id: documentId("course", course.id, `/contro-formazione/${course.slug}`),
      sourceType: "course",
      sourceId: course.id,
      title: course.title,
      body: richText(course.description),
      href: `/contro-formazione/${course.slug}`,
      publishedAt: course.publishedAt,
      context: searchContext.lessonCount(course._count.lessons),
      meta: [],
    });
  }
  for (const lesson of lessons) {
    const href = `/contro-formazione/${lesson.course.slug}/${lesson.slug}`;
    documents.push({
      id: documentId("lesson", lesson.id, href),
      sourceType: "lesson",
      sourceId: lesson.id,
      title: lesson.title,
      body: [lesson.excerpt ?? richText(lesson.excerptRich), richText(lesson.contentRich)]
        .filter(Boolean)
        .join(" "),
      href,
      publishedAt: lesson.publishedAt,
      context: searchContext.course(lesson.course.title),
      meta: [],
    });
  }
  for (const page of pages) {
    const href = `/${page.slug}`;
    documents.push({
      id: documentId("page", page.id, href),
      sourceType: "page",
      sourceId: page.id,
      title: page.title,
      body: [page.excerpt ?? richText(page.excerptRich), richText(page.contentRich)]
        .filter(Boolean)
        .join(" "),
      href,
      publishedAt: page.publishedAt,
      context: null,
      meta: [],
    });
  }

  const mapById = new Map(maps.map((map) => [map.id, map]));
  const questionnaireById = new Map(questionnaires.map((item) => [item.id, item]));
  for (const issue of publicIssues) {
    for (const block of publicBlocks(issue.homeBlocks)) {
      const href = `/uscite/${issue.slug}#issue-block-${block.id}`;
      if (block.type === "map" && block.mapId) {
        const map = mapById.get(block.mapId);
        if (map)
          documents.push({
            id: documentId("map", map.id, href),
            sourceType: "map",
            sourceId: map.id,
            title: map.title,
            body: [
              richText(map.descriptionRich),
              ...map.items.flatMap((item) => [item.title, richText(item.descriptionRich)]),
            ]
              .filter(Boolean)
              .join(" "),
            href,
            publishedAt: issue.publishedAt,
            context: issueNumberLabel(issue.id),
            meta: [],
          });
      }
      if (block.type === "questionnaireAnalysis" && block.questionnaireId) {
        const questionnaire = questionnaireById.get(block.questionnaireId);
        if (questionnaire?.status === "CLOSED")
          documents.push({
            id: documentId("questionnaire", questionnaire.id, href),
            sourceType: "questionnaire",
            sourceId: questionnaire.id,
            title: questionnaire.title,
            body: [
              richText(questionnaire.descriptionRich),
              questionnaireSearchText(questionnaire.definition),
            ]
              .filter(Boolean)
              .join(" "),
            href,
            publishedAt: issue.publishedAt,
            context: searchContext.questionnaireResults(issuePosition(issue.id)),
            meta: [],
          });
      }
    }
  }
  for (const questionnaire of questionnaires) {
    if (questionnaire.status !== "PUBLISHED" || !questionnaire.publishedAt) continue;
    const href = `/questionari/${questionnaire.slug}`;
    documents.push({
      id: documentId("questionnaire", questionnaire.id, href),
      sourceType: "questionnaire",
      sourceId: questionnaire.id,
      title: questionnaire.title,
      body: [
        richText(questionnaire.descriptionRich),
        questionnaireSearchText(questionnaire.definition),
      ]
        .filter(Boolean)
        .join(" "),
      href,
      publishedAt: questionnaire.publishedAt,
      context: searchContext.openQuestionnaire,
      meta: [],
    });
  }

  const fingerprint = sourceFingerprint ?? (await searchRepository.getSourceFingerprint());
  await searchRepository.replaceProjection(documents, fingerprint);
  return { documents: documents.length };
}
