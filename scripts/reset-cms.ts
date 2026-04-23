import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main() {
  const [deletedArticleTags, deletedArticles, deletedTags, deletedCategories, deletedIssues] =
    await prisma.$transaction([
      prisma.articleTag.deleteMany(),
      prisma.article.deleteMany(),
      prisma.tag.deleteMany(),
      prisma.category.deleteMany(),
      prisma.issue.deleteMany(),
    ]);

  console.log("CMS reset completed", {
    deletedArticleTags: deletedArticleTags.count,
    deletedArticles: deletedArticles.count,
    deletedTags: deletedTags.count,
    deletedCategories: deletedCategories.count,
    deletedIssues: deletedIssues.count,
    untouchedTables: ["user", "account", "session", "verification"],
  });
}

main()
  .catch((error) => {
    console.error("Failed to reset CMS data", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
