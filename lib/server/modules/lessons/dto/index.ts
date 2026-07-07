import { z } from "zod";

import { courseTitleStyledSchema } from "@/lib/server/modules/courses/schema";

const lessonSummaryDtoShape = {
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  title: z.string(),
  titleStyled: courseTitleStyledSchema.nullable(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  sortOrder: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  courseTitle: z.string().nullable(),
} as const;

export const lessonDtoSchema = z.object(lessonSummaryDtoShape);

export const lessonDetailDtoSchema = z.object({
  ...lessonSummaryDtoShape,
  excerptRich: z.unknown().nullable(),
  contentRich: z.unknown(),
  audioUrl: z.string().nullable(),
  audioChunks: z.unknown().nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
});

export const lessonsListDtoSchema = z.array(lessonDtoSchema);

export type LessonDto = z.infer<typeof lessonDtoSchema>;
export type LessonDetailDto = z.infer<typeof lessonDetailDtoSchema>;
