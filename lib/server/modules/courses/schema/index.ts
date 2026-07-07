import { z } from "zod";

import { issueHomeVariantSchema, issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

export const courseTitleStyledSchema = issueTitleStyledSchema;
export const courseHomeVariantSchema = issueHomeVariantSchema;

export const createCourseInputSchema = z.object({
  title: z.string().trim().min(1),
  titleStyled: courseTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1).optional(),
  description: z.unknown().optional(),
  homeVariant: courseHomeVariantSchema.default("black"),
  isActive: z.boolean().default(true),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const updateCourseInputSchema = createCourseInputSchema
  .partial()
  .extend({
    titleStyled: courseTitleStyledSchema.nullable().optional(),
    description: z.unknown().nullable().optional(),
    homeVariant: courseHomeVariantSchema.optional(),
    isActive: z.boolean().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const reorderCoursesInputSchema = z.object({
  orderedCourseIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedCourseIds must be unique",
    }),
});

const sortOrderSchema = z.enum(["asc", "desc"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const listCoursesQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
  published: booleanQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "sortOrder", "publishedAt"]).default("sortOrder"),
  sortOrder: sortOrderSchema.default("asc"),
});

export type CourseTitleStyled = z.infer<typeof courseTitleStyledSchema>;
export type CourseHomeVariant = z.infer<typeof courseHomeVariantSchema>;
export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;
export type ReorderCoursesInput = z.infer<typeof reorderCoursesInputSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
