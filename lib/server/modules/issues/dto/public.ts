import { z } from "zod";

import { issueHomeBlocksSchema, issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

const publicIssueArticleTagDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export const publicIssueArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  excerpt: z.string().nullable(),
  contentPreview: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  hasAudio: z.boolean(),
  isFeatured: z.boolean(),
  readingTimeMinutes: z.number().int().min(1),
  publishedAt: z.string(),
  categorySlug: z.string().nullable(),
  categoryName: z.string().nullable(),
  authorName: z.string().nullable(),
  tags: z.array(publicIssueArticleTagDtoSchema),
});

export const publicIssueDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  description: z.unknown().nullable(),
  homeBlocks: issueHomeBlocksSchema.nullable(),
  publishedAt: z.string(),
  articlesCount: z.number().int(),
});

export const publicIssueDetailDtoSchema = publicIssueDtoSchema.extend({
  articles: z.array(publicIssueArticleSummaryDtoSchema),
});

export const publicIssuesListDtoSchema = z.array(publicIssueDtoSchema);

export type PublicIssueDto = z.infer<typeof publicIssueDtoSchema>;
export type PublicIssueDetailDto = z.infer<typeof publicIssueDetailDtoSchema>;
export type PublicIssueArticleSummaryDto = z.infer<typeof publicIssueArticleSummaryDtoSchema>;
