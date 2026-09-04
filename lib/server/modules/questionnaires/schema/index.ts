import { z } from "zod";

import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema/definition";

import type { QuestionnaireStatus } from "@/lib/generated/prisma/enums";

const questionnaireStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
] satisfies QuestionnaireStatus[]);

const questionnaireBaseInputSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  descriptionRich: z.unknown().nullable().optional(),
  definition: questionnaireDefinitionSchema,
});

export const createQuestionnaireInputSchema = questionnaireBaseInputSchema.extend({
  status: questionnaireStatusSchema.default("DRAFT"),
  publishedAt: z.coerce.date().nullable().optional(),
  closedAt: z.coerce.date().nullable().optional(),
});

export const updateQuestionnaireInputSchema = questionnaireBaseInputSchema
  .partial()
  .extend({
    status: questionnaireStatusSchema.optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    closedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export {
  createQuestionnaireAnswersSchema,
  questionnaireCopySchema,
  questionnaireDefinitionSchema,
  questionnaireFieldSchema,
  questionnaireStepSchema,
} from "@/lib/server/modules/questionnaires/schema/definition";

export type {
  QuestionnaireAnswers,
  QuestionnaireCopy,
  QuestionnaireDefinition,
  QuestionnaireField,
  QuestionnaireStep,
} from "@/lib/server/modules/questionnaires/schema/definition";
export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireInputSchema>;
export type UpdateQuestionnaireInput = z.infer<typeof updateQuestionnaireInputSchema>;
