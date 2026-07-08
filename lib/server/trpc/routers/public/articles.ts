import "server-only";

import {
  publicArticleDetailDtoSchema,
  publicArticlesListDtoSchema,
} from "@/lib/server/modules/articles/dto/public";
import {
  publicArticleByCategoryInputSchema,
  publicArticleByIssueInputSchema,
  publicArticleSearchInputSchema,
  publicArticleSlugInputSchema,
} from "@/lib/server/modules/articles/schema/public";
import { publicArticlesService } from "@/lib/server/modules/articles/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const publicArticlesRouter = router({
  getBySlug: publicReadProcedure.input(publicArticleSlugInputSchema).query(async ({ input }) => {
    return parseOutput(
      await publicArticlesService.getBySlug(input.slug),
      publicArticleDetailDtoSchema,
    );
  }),
  listPublished: publicReadProcedure.query(async () => {
    return parseOutput(await publicArticlesService.listPublished(), publicArticlesListDtoSchema);
  }),
  listWithAudio: publicReadProcedure.query(async () => {
    return parseOutput(await publicArticlesService.listWithAudio(), publicArticlesListDtoSchema);
  }),
  listByIssue: publicReadProcedure
    .input(publicArticleByIssueInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await publicArticlesService.listByIssue(input.issueSlug),
        publicArticlesListDtoSchema,
      );
    }),
  listByCategory: publicReadProcedure
    .input(publicArticleByCategoryInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await publicArticlesService.listByCategory(input.categorySlug),
        publicArticlesListDtoSchema,
      );
    }),
  search: publicReadProcedure.input(publicArticleSearchInputSchema).query(async ({ input }) => {
    return parseOutput(
      await publicArticlesService.search(input.q, input.limit),
      publicArticlesListDtoSchema,
    );
  }),
});
