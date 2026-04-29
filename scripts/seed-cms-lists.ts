import "dotenv/config";

import { prisma } from "../lib/prisma";

const DEFAULT_COUNTS = {
  issues: 60,
  categories: 140,
  tags: 280,
  articles: 1200,
} as const;

const DEFAULT_BATCH_SIZE = 40;

function readPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name} value: ${raw}`);
  }

  return parsed;
}

async function processInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    await Promise.all(batch.map((item, index) => worker(item, offset + index)));
  }
}

function pad(num: number, width = 3) {
  return String(num).padStart(width, "0");
}

function articleStatusFromIndex(index: number): "DRAFT" | "PUBLISHED" | "ARCHIVED" {
  const bucket = index % 10;

  if (bucket <= 4) {
    return "PUBLISHED";
  }

  if (bucket <= 7) {
    return "DRAFT";
  }

  return "ARCHIVED";
}

function pickTagIndexes(articleIndex: number, totalTags: number) {
  const selected = new Set<number>();
  const count = 2 + (articleIndex % 4);

  for (let i = 0; selected.size < count; i += 1) {
    selected.add((articleIndex * 13 + i * 17) % totalTags);
  }

  return [...selected];
}

async function main() {
  const batchSize = readPositiveInt("CMS_SEED_BATCH_SIZE", DEFAULT_BATCH_SIZE);
  const issueCount = readPositiveInt("CMS_SEED_ISSUES", DEFAULT_COUNTS.issues);
  const categoryCount = readPositiveInt("CMS_SEED_CATEGORIES", DEFAULT_COUNTS.categories);
  const tagCount = readPositiveInt("CMS_SEED_TAGS", DEFAULT_COUNTS.tags);
  const articleCount = readPositiveInt("CMS_SEED_ARTICLES", DEFAULT_COUNTS.articles);

  const authors = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  if (authors.length === 0) {
    throw new Error("No users found. Run seed-admin first or create at least one user.");
  }

  const baseDate = new Date("2024-01-01T08:00:00.000Z");
  const sectionNames = ["Cultura", "Tecnologia", "Politica", "Economia", "Societa", "Scienza"];
  const tagFamilies = ["trend", "focus", "longread", "intervista", "analisi", "opinion"];

  const issueIndexes = Array.from({ length: issueCount }, (_, idx) => idx);
  const categoryIndexes = Array.from({ length: categoryCount }, (_, idx) => idx);
  const tagIndexes = Array.from({ length: tagCount }, (_, idx) => idx);
  const articleIndexes = Array.from({ length: articleCount }, (_, idx) => idx);

  const issueDescriptionDoc = (issueNumber: number) => ({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Issue di esempio ${pad(issueNumber)} per testare paginazione, filtri e ordinamenti.`,
          },
        ],
      },
    ],
  });

  await processInBatches(issueIndexes, batchSize, async (idx) => {
    const issueNumber = idx + 1;
    const publishedAt = idx % 3 === 0 ? new Date(baseDate.getTime() + idx * 86_400_000) : null;

    await prisma.issue.upsert({
      where: {
        slug: `issue-${pad(issueNumber)}`,
      },
      update: {
        title: `Issue ${pad(issueNumber)} · ${sectionNames[idx % sectionNames.length]}`,
        description: issueDescriptionDoc(issueNumber),
        isActive: idx % 5 !== 0,
        sortOrder: issueNumber,
        publishedAt,
      },
      create: {
        title: `Issue ${pad(issueNumber)} · ${sectionNames[idx % sectionNames.length]}`,
        slug: `issue-${pad(issueNumber)}`,
        description: issueDescriptionDoc(issueNumber),
        isActive: idx % 5 !== 0,
        sortOrder: issueNumber,
        publishedAt,
      },
    });
  });

  const categoryDescriptionDoc = (categoryNumber: number) => ({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Categoria di esempio ${pad(categoryNumber)} per test list API.`,
          },
        ],
      },
    ],
  });

  await processInBatches(categoryIndexes, batchSize, async (idx) => {
    const categoryNumber = idx + 1;
    const section = sectionNames[idx % sectionNames.length];

    await prisma.category.upsert({
      where: {
        slug: `category-${pad(categoryNumber)}`,
      },
      update: {
        name: `${section} ${pad(categoryNumber)}`,
        description: categoryDescriptionDoc(categoryNumber),
        isActive: idx % 7 !== 0,
      },
      create: {
        name: `${section} ${pad(categoryNumber)}`,
        slug: `category-${pad(categoryNumber)}`,
        description: categoryDescriptionDoc(categoryNumber),
        isActive: idx % 7 !== 0,
      },
    });
  });

  const tagDescriptionDoc = (tagNumber: number) => ({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Tag di esempio ${pad(tagNumber, 4)} per test sort e ricerca.`,
          },
        ],
      },
    ],
  });

  await processInBatches(tagIndexes, batchSize, async (idx) => {
    const tagNumber = idx + 1;
    const family = tagFamilies[idx % tagFamilies.length];

    await prisma.tag.upsert({
      where: {
        slug: `tag-${pad(tagNumber, 4)}`,
      },
      update: {
        name: `${family}-${pad(tagNumber, 4)}`,
        description: tagDescriptionDoc(tagNumber),
        isActive: idx % 9 !== 0,
      },
      create: {
        name: `${family}-${pad(tagNumber, 4)}`,
        slug: `tag-${pad(tagNumber, 4)}`,
        description: tagDescriptionDoc(tagNumber),
        isActive: idx % 9 !== 0,
      },
    });
  });

  const [issues, categories, tags] = await Promise.all([
    prisma.issue.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } }),
    prisma.category.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } }),
    prisma.tag.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } }),
  ]);

  if (issues.length === 0 || categories.length === 0 || tags.length === 0) {
    throw new Error("Seed prerequisites missing after upsert: issues/categories/tags must exist.");
  }

  const issuePositionMap = new Map<string, number>();
  const articleIdsByIndex: string[] = [];

  await processInBatches(articleIndexes, batchSize, async (idx) => {
    const issue = issues[idx % issues.length];
    const category = categories[(idx * 7) % categories.length];
    const author = authors[idx % authors.length];
    const status = articleStatusFromIndex(idx);
    const issuePosition = issuePositionMap.get(issue.id) ?? 0;
    issuePositionMap.set(issue.id, issuePosition + 1);

    const publishedAt =
      status === "PUBLISHED" ? new Date(baseDate.getTime() + idx * 43_200_000 + 1_800_000) : null;

    const articleNumber = idx + 1;
    const articleSlug = `article-${pad(articleNumber, 5)}`;
    const createdAt = new Date(baseDate.getTime() + idx * 21_600_000);

    const article = await prisma.article.upsert({
      where: {
        issueId_slug: {
          issueId: issue.id,
          slug: articleSlug,
        },
      },
      update: {
        issueId: issue.id,
        categoryId: category.id,
        authorId: author.id,
        status,
        isFeatured: status === "PUBLISHED" && idx % 11 === 0,
        position: issuePosition,
        publishedAt,
        title: `Articolo ${pad(articleNumber, 5)} ${sectionNames[idx % sectionNames.length]}`,
        excerpt: `Testo di esempio per articolo ${pad(articleNumber, 5)} (${status.toLowerCase()}).`,
        contentRich: {
          version: 1,
          blocks: [
            { type: "paragraph", text: `Contenuto seed per articolo ${articleNumber}.` },
            { type: "paragraph", text: `Autore: ${author.email}` },
          ],
        },
        imageUrl: `https://picsum.photos/seed/article-${articleNumber}/1280/720`,
        audioUrl:
          idx % 9 === 0
            ? `https://cdn.example.com/audio/article-${pad(articleNumber, 5)}.mp3`
            : null,
        audioChunks:
          idx % 9 === 0
            ? {
                version: 1,
                chunks: [
                  { startSec: 0, endSec: 30, text: "Introduzione" },
                  { startSec: 30, endSec: 60, text: "Approfondimento" },
                ],
              }
            : undefined,
      },
      create: {
        issueId: issue.id,
        categoryId: category.id,
        authorId: author.id,
        status,
        isFeatured: status === "PUBLISHED" && idx % 11 === 0,
        position: issuePosition,
        publishedAt,
        title: `Articolo ${pad(articleNumber, 5)} ${sectionNames[idx % sectionNames.length]}`,
        slug: articleSlug,
        excerpt: `Testo di esempio per articolo ${pad(articleNumber, 5)} (${status.toLowerCase()}).`,
        contentRich: {
          version: 1,
          blocks: [
            { type: "paragraph", text: `Contenuto seed per articolo ${articleNumber}.` },
            { type: "paragraph", text: `Autore: ${author.email}` },
          ],
        },
        imageUrl: `https://picsum.photos/seed/article-${articleNumber}/1280/720`,
        audioUrl:
          idx % 9 === 0
            ? `https://cdn.example.com/audio/article-${pad(articleNumber, 5)}.mp3`
            : null,
        audioChunks:
          idx % 9 === 0
            ? {
                version: 1,
                chunks: [
                  { startSec: 0, endSec: 30, text: "Introduzione" },
                  { startSec: 30, endSec: 60, text: "Approfondimento" },
                ],
              }
            : undefined,
        createdAt,
      },
      select: {
        id: true,
      },
    });

    articleIdsByIndex[idx] = article.id;
  });

  await processInBatches(articleIdsByIndex, batchSize, async (articleId, idx) => {
    const tagIndexesForArticle = pickTagIndexes(idx, tags.length);
    const data = tagIndexesForArticle.map((tagIndex) => ({
      articleId,
      tagId: tags[tagIndex]?.id,
    }));

    await prisma.articleTag.deleteMany({ where: { articleId } });
    await prisma.articleTag.createMany({
      data: data.filter((item): item is { articleId: string; tagId: string } =>
        Boolean(item.tagId),
      ),
      skipDuplicates: true,
    });
  });

  const [issuesTotal, categoriesTotal, tagsTotal, articlesTotal, articleTagsTotal] =
    await Promise.all([
      prisma.issue.count(),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.article.count(),
      prisma.articleTag.count(),
    ]);

  console.log("CMS list seed completed", {
    usersAvailable: authors.length,
    issues: issuesTotal,
    categories: categoriesTotal,
    tags: tagsTotal,
    articles: articlesTotal,
    articleTags: articleTagsTotal,
    expectedPagesAt20: {
      issues: Math.ceil(issuesTotal / 20),
      categories: Math.ceil(categoriesTotal / 20),
      tags: Math.ceil(tagsTotal / 20),
      articles: Math.ceil(articlesTotal / 20),
    },
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed CMS list data", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
