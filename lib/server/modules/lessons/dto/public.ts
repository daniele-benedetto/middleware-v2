import { z } from "zod";

import { courseTitleStyledSchema } from "@/lib/server/modules/courses/schema";

const publicLessonBaseShape = {
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  titleStyled: courseTitleStyledSchema.nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  hasAudio: z.boolean(),
  sortOrder: z.number().int(),
  readingTimeMinutes: z.number().int().min(1),
  publishedAt: z.string(),
  courseId: z.string().uuid(),
  courseSlug: z.string(),
  courseTitle: z.string(),
} as const;

export const publicLessonSummaryDtoSchema = z.object(publicLessonBaseShape);

export const publicLessonDetailDtoSchema = z.object({
  ...publicLessonBaseShape,
  excerptRich: z.unknown().nullable(),
  contentRich: z.unknown(),
  audioUrl: z.string().nullable(),
  audioChunks: z.unknown().nullable(),
  updatedAt: z.string(),
});

export const publicLessonsListDtoSchema = z.array(publicLessonSummaryDtoSchema);

export type PublicLessonSummaryDto = z.infer<typeof publicLessonSummaryDtoSchema>;
export type PublicLessonDetailDto = z.infer<typeof publicLessonDetailDtoSchema>;
