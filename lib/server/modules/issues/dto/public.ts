import { z } from "zod";

import { articleImageSettingsSchema } from "@/lib/articles/image-settings";
import { publicCourseDetailDtoSchema } from "@/lib/server/modules/courses/dto/public";
import {
  issueHomeBlocksSchema,
  issueHomeVariantSchema,
  issueTitleStyledSchema,
} from "@/lib/server/modules/issues/schema";
import { publicMapDetailDtoSchema } from "@/lib/server/modules/maps/dto/public";

export const publicIssueArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageSettings: articleImageSettingsSchema.optional(),
  hasAudio: z.boolean(),
  readingTimeMinutes: z.number().int().min(1),
  publishedAt: z.string(),
  categorySlug: z.string().nullable(),
  categoryName: z.string().nullable(),
  authorName: z.string().nullable(),
});

export const publicIssueDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  description: z.unknown().nullable(),
  homeBlocks: issueHomeBlocksSchema.nullable(),
  homeVariant: issueHomeVariantSchema,
  publishedAt: z.string(),
  articlesCount: z.number().int(),
});

export const publicIssueDetailDtoSchema = publicIssueDtoSchema.extend({
  articles: z.array(publicIssueArticleSummaryDtoSchema),
  courses: z.array(publicCourseDetailDtoSchema),
  maps: z.array(publicMapDetailDtoSchema),
});

export const publicIssuesListDtoSchema = z.array(publicIssueDtoSchema);

export type PublicIssueDto = z.infer<typeof publicIssueDtoSchema>;
export type PublicIssueDetailDto = z.infer<typeof publicIssueDetailDtoSchema>;
export type PublicIssueArticleSummaryDto = z.infer<typeof publicIssueArticleSummaryDtoSchema>;
