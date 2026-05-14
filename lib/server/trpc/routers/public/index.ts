import "server-only";

import { router } from "@/lib/server/trpc/init";
import { publicArticlesRouter } from "@/lib/server/trpc/routers/public/articles";
import { publicCategoriesRouter } from "@/lib/server/trpc/routers/public/categories";
import { publicIssuesRouter } from "@/lib/server/trpc/routers/public/issues";
import { publicTagsRouter } from "@/lib/server/trpc/routers/public/tags";

export const publicRouter = router({
  issues: publicIssuesRouter,
  articles: publicArticlesRouter,
  categories: publicCategoriesRouter,
  tags: publicTagsRouter,
});
