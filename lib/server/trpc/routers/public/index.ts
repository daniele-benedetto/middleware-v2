import "server-only";

import { router } from "@/lib/server/trpc/init";
import { publicArticlesRouter } from "@/lib/server/trpc/routers/public/articles";
import { publicCategoriesRouter } from "@/lib/server/trpc/routers/public/categories";
import { publicCoursesRouter } from "@/lib/server/trpc/routers/public/courses";
import { publicIssuesRouter } from "@/lib/server/trpc/routers/public/issues";
import { publicLessonsRouter } from "@/lib/server/trpc/routers/public/lessons";
import { publicPagesRouter } from "@/lib/server/trpc/routers/public/pages";
import { publicTagsRouter } from "@/lib/server/trpc/routers/public/tags";

export const publicRouter = router({
  issues: publicIssuesRouter,
  articles: publicArticlesRouter,
  courses: publicCoursesRouter,
  lessons: publicLessonsRouter,
  categories: publicCategoriesRouter,
  tags: publicTagsRouter,
  pages: publicPagesRouter,
});
