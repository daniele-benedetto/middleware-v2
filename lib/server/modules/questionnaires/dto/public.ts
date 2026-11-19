import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
  publicVisualizationSchema,
} from "@/lib/server/modules/questionnaires/schema";
import {
  choiceResultsOrderSchema,
  questionnaireConditionOperatorSchema,
} from "@/lib/server/modules/questionnaires/schema/definition";

export const publicQuestionnaireDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  descriptionRich: z.unknown().nullable(),
  definition: questionnaireDefinitionSchema,
  isClosed: z.boolean(),
  /** True when the questionnaire is closed and its results page (`/questionari/:slug/risultati`) exists. */
  hasPublicResults: z.boolean(),
});

export const publicQuestionnaireResponderDtoSchema = z.object({
  initialized: z.literal(true),
});

export const publicQuestionnaireResponderStatusDtoSchema = z.object({
  hasResponded: z.boolean(),
});

export const publicQuestionnaireSubmitDtoSchema = z.object({
  id: z.string().uuid(),
  questionnaireId: z.string().uuid(),
  submittedAt: z.string().datetime({ offset: true }),
});

const publicChoiceResultSchema = z.object({
  kind: z.literal("choice"),
  fieldId: z.string().uuid(),
  responseCount: z.number().int().nonnegative(),
  options: z.array(
    z.object({
      optionId: z.string().uuid(),
      count: z.number().int().nonnegative(),
    }),
  ),
});
const publicBooleanResultSchema = z.object({
  kind: z.literal("boolean"),
  fieldId: z.string().uuid(),
  responseCount: z.number().int().nonnegative(),
  trueCount: z.number().int().nonnegative(),
  falseCount: z.number().int().nonnegative(),
});
const publicNumberResultSchema = z.object({
  kind: z.literal("number"),
  fieldId: z.string().uuid(),
  responseCount: z.number().int().nonnegative(),
  minimum: z.number().nullable(),
  maximum: z.number().nullable(),
  average: z.number().nullable(),
});
const publicDateResultSchema = z.object({
  kind: z.literal("date"),
  fieldId: z.string().uuid(),
  responseCount: z.number().int().nonnegative(),
  minimum: z.string().nullable(),
  maximum: z.string().nullable(),
});

export const publicQuestionnaireResultsDtoSchema = z.array(
  z.discriminatedUnion("kind", [
    publicChoiceResultSchema,
    publicBooleanResultSchema,
    publicNumberResultSchema,
    publicDateResultSchema,
  ]),
);

const describedConditionDtoSchema = z.object({
  fieldLabel: z.string(),
  operator: questionnaireConditionOperatorSchema,
  /** How `values` must be formatted; `consent` carries `1` (given) or `0` (not given). */
  valueKind: z.enum(["none", "text", "number", "date", "datetime", "consent"]),
  values: z.array(z.union([z.string(), z.number()])),
});

export const questionnaireDescribedRuleDtoSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(describedConditionDtoSchema),
});

/** Who a conditional field was shown to. */
export const questionnaireFieldAudienceDtoSchema = z.object({
  /** Responses the field was shown to. */
  shownCount: z.number().int().nonnegative(),
  /** Responses considered. */
  totalCount: z.number().int().nonnegative(),
  /** Rules that must ALL hold for the field to be shown, labels already resolved. */
  rules: z.array(questionnaireDescribedRuleDtoSchema),
  /**
   * Rules of the earlier steps that END the questionnaire (`endWhen`): the field is not shown
   * to the respondents who satisfied any of them.
   */
  endRules: z.array(questionnaireDescribedRuleDtoSchema).optional(),
});

const publicAnalysisFieldBaseSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  description: z.string().nullable(),
  fieldType: z.enum([
    "boolean",
    "singleChoice",
    "multipleChoice",
    "scale",
    "integer",
    "decimal",
    "date",
    "datetime",
  ]),
  responseCount: z.number().int().nonnegative(),
  /** Responses without an answer, the ones the field was not shown to included. */
  missingCount: z.number().int().nonnegative(),
  /** Present only for conditional fields; absent means "shown to every respondent". */
  audience: questionnaireFieldAudienceDtoSchema.optional(),
  visualization: publicVisualizationSchema,
});

const publicAnalysisChoiceFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("choice"),
  multiple: z.boolean(),
  /** Order of `options`; absent in payloads cached before the setting existed (= "frequency"). */
  resultsOrder: choiceResultsOrderSchema.optional(),
  /** `rank` is always the position by frequency (1 = most chosen), whatever the order. */
  options: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
      rank: z.number().int().positive(),
      /**
       * True only for the synthetic "Altro (specificare)" option (id
       * `QUESTIONNAIRE_OTHER_OPTION_ID`), present when the field allows it; the free texts are
       * never part of the public analysis.
       */
      isOther: z.literal(true).optional(),
    }),
  ),
});
const publicAnalysisBooleanFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("boolean"),
  trueLabel: z.string(),
  falseLabel: z.string(),
  trueCount: z.number().int().nonnegative(),
  falseCount: z.number().int().nonnegative(),
});
const publicAnalysisNumberFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("number"),
  numericType: z.enum(["scale", "integer", "decimal"]),
  integerVisualization: z.enum(["discrete", "histogram"]).optional(),
  minimum: z.number().nullable(),
  maximum: z.number().nullable(),
  average: z.number().nullable(),
  median: z.number().nullable(),
  q1: z.number().nullable(),
  q3: z.number().nullable(),
  iqr: z.number().nullable(),
  distribution: z.array(
    z.object({
      minimum: z.number(),
      maximum: z.number(),
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
    }),
  ),
  discrete: z.boolean(),
});
const publicAnalysisDateFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("date"),
  temporalType: z.enum(["date", "datetime"]),
  temporalMeaning: z.enum(["distribution", "event"]),
  timeDetail: z.enum(["none", "hourOfDay", "dayHour"]),
  timezone: z.literal("UTC"),
  minimum: z.string().nullable(),
  maximum: z.string().nullable(),
  bucketUnit: z.enum(["day", "week", "month", "quarter", "year"]),
  includeEmptyBuckets: z.boolean(),
  distribution: z.array(
    z.object({
      date: z.string(),
      start: z.string(),
      end: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
    }),
  ),
  hourDistribution: z
    .array(
      z.object({
        hour: z.number().int().min(0).max(23),
        count: z.number().int().nonnegative(),
        percentage: z.number().nonnegative(),
      }),
    )
    .optional(),
});

export const publicQuestionnaireAnalysisDtoSchema = z.object({
  analysisVersion: z.literal(1),
  id: z.string().uuid(),
  /** Slug of the results page; absent in payloads built without it (e.g. cached before it existed). */
  slug: z.string().optional(),
  /** Number of submitted responses, whatever the fields answered; same availability as `slug`. */
  totalResponses: z.number().int().nonnegative().optional(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  homeVariant: questionnaireHomeVariantSchema,
  descriptionRich: z.unknown().nullable(),
  closedAt: z.string().datetime({ offset: true }),
  fields: z.array(
    z.discriminatedUnion("kind", [
      publicAnalysisChoiceFieldSchema,
      publicAnalysisBooleanFieldSchema,
      publicAnalysisNumberFieldSchema,
      publicAnalysisDateFieldSchema,
    ]),
  ),
});

export type PublicQuestionnaireDto = z.infer<typeof publicQuestionnaireDtoSchema>;
export type PublicQuestionnaireAnalysisDto = z.infer<typeof publicQuestionnaireAnalysisDtoSchema>;
export type QuestionnaireFieldAudienceDto = z.infer<typeof questionnaireFieldAudienceDtoSchema>;
export type QuestionnaireDescribedRuleDto = z.infer<typeof questionnaireDescribedRuleDtoSchema>;
