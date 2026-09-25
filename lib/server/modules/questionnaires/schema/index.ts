import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema/definition";

import type { QuestionnaireStatus } from "@/lib/generated/prisma/enums";

export const questionnaireStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
] satisfies QuestionnaireStatus[]);
export const questionnaireHomeVariantSchema = z.enum(["default", "red", "black"]);

const questionnaireBaseInputSchema = z.object({
  title: z.string().trim().min(1),
  titleStyled: issueTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1),
  descriptionRich: z.unknown().nullable().optional(),
  definition: questionnaireDefinitionSchema,
  homeVariant: questionnaireHomeVariantSchema.optional(),
});

export const createQuestionnaireInputSchema = questionnaireBaseInputSchema;

export const updateQuestionnaireInputSchema = questionnaireBaseInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const listQuestionnairesQuerySchema = z.object({
  status: questionnaireStatusSchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "publishedAt", "closedAt", "title"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export {
  createQuestionnaireAnswersSchema,
  createQuestionnaireFieldAnswerSchema,
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
export type ListQuestionnairesQuery = z.infer<typeof listQuestionnairesQuerySchema>;
export type QuestionnaireHomeVariant = z.infer<typeof questionnaireHomeVariantSchema>;
