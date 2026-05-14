import { z } from "zod";

export const publicArticleTagDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

const publicArticleBaseShape = {
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  hasAudio: z.boolean(),
  isFeatured: z.boolean(),
  publishedAt: z.string(),
  issueId: z.string().uuid(),
  issueSlug: z.string(),
  issueTitle: z.string(),
  categoryId: z.string().uuid(),
  categorySlug: z.string(),
  categoryName: z.string(),
  authorId: z.string().uuid(),
  authorName: z.string().nullable(),
  tagsCount: z.number().int(),
} as const;

export const publicArticleSummaryDtoSchema = z.object(publicArticleBaseShape);

export const publicArticleDetailDtoSchema = z.object({
  ...publicArticleBaseShape,
  excerptRich: z.unknown().nullable(),
  contentRich: z.unknown(),
  audioUrl: z.string().nullable(),
  audioChunks: z.unknown().nullable(),
  updatedAt: z.string(),
  tags: z.array(publicArticleTagDtoSchema),
});

export const publicArticlesListDtoSchema = z.array(publicArticleSummaryDtoSchema);

export type PublicArticleTagDto = z.infer<typeof publicArticleTagDtoSchema>;
export type PublicArticleSummaryDto = z.infer<typeof publicArticleSummaryDtoSchema>;
export type PublicArticleDetailDto = z.infer<typeof publicArticleDetailDtoSchema>;
