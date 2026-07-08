import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

const publicArticleBaseShape = {
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  hasAudio: z.boolean(),
  publishedAt: z.string(),
  issueId: z.string().uuid(),
  issueSlug: z.string(),
  issueTitle: z.string(),
  categoryId: z.string().uuid(),
  categorySlug: z.string(),
  categoryName: z.string(),
  authorId: z.string().uuid().nullable(),
  authorName: z.string().nullable(),
} as const;

export const publicArticleSummaryDtoSchema = z.object(publicArticleBaseShape);

export const publicArticleDetailDtoSchema = z.object({
  ...publicArticleBaseShape,
  excerptRich: z.unknown().nullable(),
  contentRich: z.unknown(),
  readingTimeMinutes: z.number().int().min(1),
  audioUrl: z.string().nullable(),
  audioChunks: z.unknown().nullable(),
  updatedAt: z.string(),
});

export const publicArticlesListDtoSchema = z.array(publicArticleSummaryDtoSchema);

export type PublicArticleSummaryDto = z.infer<typeof publicArticleSummaryDtoSchema>;
export type PublicArticleDetailDto = z.infer<typeof publicArticleDetailDtoSchema>;
