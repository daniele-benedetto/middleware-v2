import { z } from "zod";

import {
  publicQuestionnaireAnalysisDtoSchema,
  questionnaireFieldAudienceDtoSchema,
} from "@/lib/server/modules/questionnaires/dto/public";
import { questionnaireStatusSchema } from "@/lib/server/modules/questionnaires/schema";

/** Exactly the field shape of the public analysis, so the public chart/table components apply. */
export const questionnaireAnalysisFieldDtoSchema =
  publicQuestionnaireAnalysisDtoSchema.shape.fields.element;

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
  /** Chartable field: `analysis` is a public analysis field (aggregate + visualization). */
  z.object({
    kind: z.literal("analysis"),
    analysis: questionnaireAnalysisFieldDtoSchema,
    /**
     * Free texts of the "Altro (specificare)" answers, newest first. Present only for choice
     * fields with `allowOther`; CMS-only, never part of the public analysis.
     */
    otherAnswers: z.array(questionnaireOtherAnswerDtoSchema).optional(),
  }),
  /** Free text (text, textarea, email, phone, url): answers come from `listFieldAnswers`. */
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
  /** Responses with a valid, non-empty answer for this field. */
  answeredCount: countSchema,
  /** Responses without an answer for this field, the ones it was not shown to included. */
  missingCount: countSchema,
  /** Present only for conditional fields; absent means "shown to every respondent". */
  audience: questionnaireFieldAudienceDtoSchema.optional(),
  /** Responses whose stored answer no longer validates against the field definition. */
  invalidCount: countSchema,
  result: questionnaireSummaryFieldResultDtoSchema,
});

export const questionnaireSummaryTimelineDtoSchema = z.object({
  timezone: z.literal(QUESTIONNAIRE_SUMMARY_TIMEZONE),
  /** One entry per calendar day from the first to the last response, empty days included. */
  days: z.array(z.object({ date: dayKeySchema, count: countSchema, cumulative: countSchema })),
});

export const questionnaireSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  status: questionnaireStatusSchema,
  publishedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  /** Responses the summary is computed on (the ones matching the filter, when there is one). */
  responseCount: countSchema,
  /** Every response of the questionnaire, whatever the filter. */
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

export type QuestionnaireAnalysisFieldDto = z.infer<typeof questionnaireAnalysisFieldDtoSchema>;
export type QuestionnaireOtherAnswerDto = z.infer<typeof questionnaireOtherAnswerDtoSchema>;
export type QuestionnaireSummaryFieldDto = z.infer<typeof questionnaireSummaryFieldDtoSchema>;
export type QuestionnaireSummaryFieldResultDto = z.infer<
  typeof questionnaireSummaryFieldResultDtoSchema
>;
export type QuestionnaireSummaryTimelineDto = z.infer<typeof questionnaireSummaryTimelineDtoSchema>;
export type QuestionnaireSummaryDto = z.infer<typeof questionnaireSummaryDtoSchema>;
export type QuestionnaireFieldAnswersDto = z.infer<typeof questionnaireFieldAnswersDtoSchema>;
