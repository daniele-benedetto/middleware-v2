import "server-only";

import { router } from "@/lib/server/trpc/init";
import { articlesRouter } from "@/lib/server/trpc/routers/articles";
import { authorsRouter } from "@/lib/server/trpc/routers/authors";
import { categoriesRouter } from "@/lib/server/trpc/routers/categories";
import { issuesRouter } from "@/lib/server/trpc/routers/issues";
import { mediaRouter } from "@/lib/server/trpc/routers/media";
import { navigationRouter } from "@/lib/server/trpc/routers/navigation";
import { observabilityAggregatesRouter } from "@/lib/server/trpc/routers/observability-aggregates";
import { observabilityAuditRouter } from "@/lib/server/trpc/routers/observability-audit";
import { observabilityErrorsRouter } from "@/lib/server/trpc/routers/observability-errors";
import { observabilityOverviewRouter } from "@/lib/server/trpc/routers/observability-overview";
import { pagesRouter } from "@/lib/server/trpc/routers/pages";
import { performanceRouter } from "@/lib/server/trpc/routers/performance";
import { publicRouter } from "@/lib/server/trpc/routers/public";
import { tagsRouter } from "@/lib/server/trpc/routers/tags";
import { telemetryRouter } from "@/lib/server/trpc/routers/telemetry";
import { usersRouter } from "@/lib/server/trpc/routers/users";

export const appRouter = router({
  authors: authorsRouter,
  users: usersRouter,
  issues: issuesRouter,
  categories: categoriesRouter,
  tags: tagsRouter,
  articles: articlesRouter,
  pages: pagesRouter,
  performance: performanceRouter,
  media: mediaRouter,
  navigation: navigationRouter,
  observabilityAudit: observabilityAuditRouter,
  observabilityAggregates: observabilityAggregatesRouter,
  observabilityErrors: observabilityErrorsRouter,
  observabilityOverview: observabilityOverviewRouter,
  public: publicRouter,
  telemetry: telemetryRouter,
});

export type AppRouter = typeof appRouter;
