import { z } from "zod";

export const issueDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  color: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const issuesListDtoSchema = z.array(issueDtoSchema);

export type IssueDto = z.infer<typeof issueDtoSchema>;
