import { z } from "zod";

export const publicArticleSlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export const publicArticleByIssueInputSchema = z.object({
  issueSlug: z.string().trim().min(1),
});

export const publicArticleByCategoryInputSchema = z.object({
  categorySlug: z.string().trim().min(1),
});

export const publicArticleSearchInputSchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.number().int().min(1).max(20).default(10),
});

export type PublicArticleSlugInput = z.infer<typeof publicArticleSlugInputSchema>;
export type PublicArticleByIssueInput = z.infer<typeof publicArticleByIssueInputSchema>;
export type PublicArticleByCategoryInput = z.infer<typeof publicArticleByCategoryInputSchema>;
export type PublicArticleSearchInput = z.infer<typeof publicArticleSearchInputSchema>;
