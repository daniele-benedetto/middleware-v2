import { z } from "zod";

export const publicLessonSlugInputSchema = z.object({
  courseSlug: z.string().trim().min(1),
  lessonSlug: z.string().trim().min(1),
});

export const publicLessonByCourseInputSchema = z.object({
  courseSlug: z.string().trim().min(1),
});

export type PublicLessonSlugInput = z.infer<typeof publicLessonSlugInputSchema>;
export type PublicLessonByCourseInput = z.infer<typeof publicLessonByCourseInputSchema>;
