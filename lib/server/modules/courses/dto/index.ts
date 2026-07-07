import { z } from "zod";

import {
  courseHomeVariantSchema,
  courseTitleStyledSchema,
} from "@/lib/server/modules/courses/schema";

export const courseDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: courseTitleStyledSchema.nullable(),
  slug: z.string(),
  description: z.unknown().nullable(),
  homeVariant: courseHomeVariantSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lessonsCount: z.number().int(),
});

export const courseLessonSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  sortOrder: z.number().int(),
});

export const courseDetailDtoSchema = courseDtoSchema.extend({
  lessons: z.array(courseLessonSummaryDtoSchema),
});

export const coursesListDtoSchema = z.array(courseDtoSchema);

export type CourseDto = z.infer<typeof courseDtoSchema>;
export type CourseDetailDto = z.infer<typeof courseDetailDtoSchema>;
export type CourseLessonSummaryDto = z.infer<typeof courseLessonSummaryDtoSchema>;
