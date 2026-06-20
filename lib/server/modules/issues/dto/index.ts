import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

export const issueDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  description: z.unknown().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const issueArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  position: z.number().int(),
});

export const issueDetailDtoSchema = issueDtoSchema.extend({
  articles: z.array(issueArticleSummaryDtoSchema),
});

export const issuesListDtoSchema = z.array(issueDtoSchema);

export type IssueDto = z.infer<typeof issueDtoSchema>;
export type IssueDetailDto = z.infer<typeof issueDetailDtoSchema>;
export type IssueArticleSummaryDto = z.infer<typeof issueArticleSummaryDtoSchema>;
