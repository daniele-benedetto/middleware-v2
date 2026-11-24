import { z } from "zod";

import {
  questionnaireAnalysisFieldDtoSchema,
  questionnaireFieldAudienceDtoSchema,
} from "@/lib/server/modules/questionnaires/dto/public";
import { questionnaireStatusSchema } from "@/lib/server/modules/questionnaires/schema";

export const QUESTIONNAIRE_SUMMARY_TIMEZONE = "Europe/Rome";

const countSchema = z.number().int().nonnegative();
const dayKeySchema = z.iso.date();
const freeTextFieldTypeSchema = z.enum(["text", "textarea", "email", "phone", "url"]);
const answerableFieldTypeSchema = z.enum([
  ...freeTextFieldTypeSchema.options,
  "integer",
  "decimal",
  "scale",
  "boolean",
  "date",
  "datetime",
  "singleChoice",
  "multipleChoice",
  "consent",
]);

const questionnaireOtherAnswerDtoSchema = z.object({
  responseId: z.string().uuid(),
  submittedAt: z.string(),
  value: z.string(),
});

export const questionnaireSummaryFieldResultDtoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("analysis"),
    analysis: questionnaireAnalysisFieldDtoSchema,
    otherAnswers: z.array(questionnaireOtherAnswerDtoSchema).optional(),
  }),
  z.object({ kind: z.literal("text") }),
  z.object({
    kind: z.literal("consent"),
    acceptedCount: countSchema,
    declinedCount: countSchema,
  }),
]);

export const questionnaireSummaryFieldDtoSchema = z.object({
  id: z.string().uuid(),
  type: answerableFieldTypeSchema,
  label: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
  publicResults: z.boolean(),
  stepId: z.string().uuid(),
  stepIndex: countSchema,
  stepTitle: z.string().nullable(),
  answeredCount: countSchema,
  missingCount: countSchema,
  audience: questionnaireFieldAudienceDtoSchema.optional(),
  invalidCount: countSchema,
  result: questionnaireSummaryFieldResultDtoSchema,
});

export const questionnaireSummaryTimelineDtoSchema = z.object({
  timezone: z.literal(QUESTIONNAIRE_SUMMARY_TIMEZONE),
  days: z.array(z.object({ date: dayKeySchema, count: countSchema, cumulative: countSchema })),
});

export const questionnaireSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  status: questionnaireStatusSchema,
  publishedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  responseCount: countSchema,
  totalResponseCount: countSchema,
  firstResponseAt: z.string().nullable(),
  lastResponseAt: z.string().nullable(),
  timeline: questionnaireSummaryTimelineDtoSchema,
  fields: z.array(questionnaireSummaryFieldDtoSchema),
});

export const questionnaireFieldAnswersDtoSchema = z.object({
  field: z.object({
    id: z.string().uuid(),
    type: freeTextFieldTypeSchema,
    label: z.string(),
    stepTitle: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      responseId: z.string().uuid(),
      submittedAt: z.string(),
      value: z.string(),
    }),
  ),
  total: countSchema,
});

export type QuestionnaireOtherAnswerDto = z.infer<typeof questionnaireOtherAnswerDtoSchema>;
export type QuestionnaireSummaryFieldDto = z.infer<typeof questionnaireSummaryFieldDtoSchema>;
export type QuestionnaireSummaryFieldResultDto = z.infer<
  typeof questionnaireSummaryFieldResultDtoSchema
>;
export type QuestionnaireSummaryTimelineDto = z.infer<typeof questionnaireSummaryTimelineDtoSchema>;
export type QuestionnaireSummaryDto = z.infer<typeof questionnaireSummaryDtoSchema>;
export type QuestionnaireFieldAnswersDto = z.infer<typeof questionnaireFieldAnswersDtoSchema>;
