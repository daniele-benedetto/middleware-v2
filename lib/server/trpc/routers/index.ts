import "server-only";

import { router } from "@/lib/server/trpc/init";
import { articlesRouter } from "@/lib/server/trpc/routers/articles";
import { auditLogsRouter } from "@/lib/server/trpc/routers/audit-logs";
import { categoriesRouter } from "@/lib/server/trpc/routers/categories";
import { issuesRouter } from "@/lib/server/trpc/routers/issues";
import { mediaRouter } from "@/lib/server/trpc/routers/media";
import { tagsRouter } from "@/lib/server/trpc/routers/tags";
import { usersRouter } from "@/lib/server/trpc/routers/users";

export const appRouter = router({
  auditLogs: auditLogsRouter,
  users: usersRouter,
  issues: issuesRouter,
  categories: categoriesRouter,
  tags: tagsRouter,
  articles: articlesRouter,
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;
