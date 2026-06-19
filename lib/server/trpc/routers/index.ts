import "server-only";

import { router } from "@/lib/server/trpc/init";
import { articlesRouter } from "@/lib/server/trpc/routers/articles";
import { auditLogsRouter } from "@/lib/server/trpc/routers/audit-logs";
import { authorsRouter } from "@/lib/server/trpc/routers/authors";
import { categoriesRouter } from "@/lib/server/trpc/routers/categories";
import { issuesRouter } from "@/lib/server/trpc/routers/issues";
import { mediaRouter } from "@/lib/server/trpc/routers/media";
import { pagesRouter } from "@/lib/server/trpc/routers/pages";
import { publicRouter } from "@/lib/server/trpc/routers/public";
import { tagsRouter } from "@/lib/server/trpc/routers/tags";
import { usersRouter } from "@/lib/server/trpc/routers/users";

export const appRouter = router({
  auditLogs: auditLogsRouter,
  authors: authorsRouter,
  users: usersRouter,
  issues: issuesRouter,
  categories: categoriesRouter,
  tags: tagsRouter,
  articles: articlesRouter,
  pages: pagesRouter,
  media: mediaRouter,
  public: publicRouter,
});

export type AppRouter = typeof appRouter;
