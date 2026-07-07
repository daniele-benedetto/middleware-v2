import { z } from "zod";

import {
  courseHomeVariantSchema,
  courseTitleStyledSchema,
} from "@/lib/server/modules/courses/schema";

export const publicCourseLessonSummaryDtoSchema = z.object({
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
});

export const publicCourseDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: courseTitleStyledSchema.nullable(),
  slug: z.string(),
  description: z.unknown().nullable(),
  homeVariant: courseHomeVariantSchema,
  publishedAt: z.string(),
  lessonsCount: z.number().int(),
});

export const publicCourseDetailDtoSchema = publicCourseDtoSchema.extend({
  lessons: z.array(publicCourseLessonSummaryDtoSchema),
});

export const publicCoursesListDtoSchema = z.array(publicCourseDtoSchema);

export type PublicCourseDto = z.infer<typeof publicCourseDtoSchema>;
export type PublicCourseDetailDto = z.infer<typeof publicCourseDetailDtoSchema>;
export type PublicCourseLessonSummaryDto = z.infer<typeof publicCourseLessonSummaryDtoSchema>;
