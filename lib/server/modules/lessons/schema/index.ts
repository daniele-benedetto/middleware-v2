import { z } from "zod";

import { courseTitleStyledSchema } from "@/lib/server/modules/courses/schema";

import type { LessonStatus } from "@/lib/generated/prisma/enums";

const mediaUrlSchema = z.string().trim().min(1);

const lessonBaseInputSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1),
  titleStyled: courseTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1),
  excerptRich: z.unknown().optional(),
  contentRich: z.unknown(),
  imageUrl: mediaUrlSchema.optional(),
  imageAlt: z.string().trim().max(240).optional(),
  audioUrl: mediaUrlSchema.optional(),
  audioChunks: z.unknown().optional(),
});

export const createLessonInputSchema = lessonBaseInputSchema;

export const updateLessonInputSchema = lessonBaseInputSchema
  .partial()
  .extend({
    excerptRich: z.unknown().nullable().optional(),
    imageUrl: mediaUrlSchema.nullable().optional(),
    imageAlt: z.string().trim().max(240).nullable().optional(),
    audioUrl: mediaUrlSchema.nullable().optional(),
    audioChunks: z.unknown().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies LessonStatus[]).optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const reorderLessonsInputSchema = z.object({
  courseId: z.string().uuid(),
  orderedLessonIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedLessonIds must be unique",
    }),
});

const sortOrderSchema = z.enum(["asc", "desc"]);

export const listLessonsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies LessonStatus[]).optional(),
  courseId: z.string().uuid().optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "sortOrder", "publishedAt"]).default("sortOrder"),
  sortOrder: sortOrderSchema.default("asc"),
});

export type LessonTitleStyled = z.infer<typeof courseTitleStyledSchema>;
export type CreateLessonInput = z.infer<typeof createLessonInputSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonInputSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsInputSchema>;
export type ListLessonsQuery = z.infer<typeof listLessonsQuerySchema>;
