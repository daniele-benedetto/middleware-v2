import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
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
  valueKind: z.enum(["none", "text", "number", "date", "datetime", "consent"]),
  values: z.array(z.union([z.string(), z.number()])),
});

export const questionnaireDescribedRuleDtoSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(describedConditionDtoSchema),
});

export const questionnaireFieldAudienceDtoSchema = z.object({
  shownCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  rules: z.array(questionnaireDescribedRuleDtoSchema),
  endRules: z.array(questionnaireDescribedRuleDtoSchema).optional(),
});

const analysisFieldTypeSchema = z.enum([
  "boolean",
  "singleChoice",
  "multipleChoice",
  "scale",
  "integer",
  "decimal",
  "date",
  "datetime",
]);
const countSchema = z.number().int().nonnegative();
const percentageSchema = z.number().nonnegative();

const publicAnalysisFieldBaseSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  description: z.string().nullable(),
  fieldType: analysisFieldTypeSchema,
  hasResponses: z.boolean(),
});
const analysisFieldCountsSchema = z.object({
  responseCount: countSchema,
  missingCount: countSchema,
});

const publicChoiceOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  percentage: percentageSchema,
  rank: z.number().int().positive(),
  isOther: z.literal(true).optional(),
});
const publicAnalysisChoiceFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("choice"),
  multiple: z.boolean(),
  resultsOrder: choiceResultsOrderSchema.optional(),
  options: z.array(publicChoiceOptionSchema),
});
const analysisChoiceFieldSchema = publicAnalysisChoiceFieldSchema
  .extend(analysisFieldCountsSchema.shape)
  .extend({ options: z.array(publicChoiceOptionSchema.extend({ count: countSchema })) });

const publicAnalysisBooleanFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("boolean"),
  trueLabel: z.string(),
  falseLabel: z.string(),
  truePercentage: percentageSchema,
  falsePercentage: percentageSchema,
});
const analysisBooleanFieldSchema = publicAnalysisBooleanFieldSchema
  .extend(analysisFieldCountsSchema.shape)
  .extend({ trueCount: countSchema, falseCount: countSchema });

const publicNumericBucketSchema = z.object({
  minimum: z.number(),
  maximum: z.number(),
  percentage: percentageSchema,
});
const publicAnalysisNumberFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("number"),
  numericType: z.enum(["scale", "integer", "decimal"]),
  average: z.number().nullable(),
  median: z.number().nullable(),
  distribution: z.array(publicNumericBucketSchema),
  discrete: z.boolean(),
});
const analysisNumberFieldSchema = publicAnalysisNumberFieldSchema
  .extend(analysisFieldCountsSchema.shape)
  .extend({
    integerVisualization: z.enum(["discrete", "histogram"]).optional(),
    minimum: z.number().nullable(),
    maximum: z.number().nullable(),
    q1: z.number().nullable(),
    q3: z.number().nullable(),
    iqr: z.number().nullable(),
    distribution: z.array(publicNumericBucketSchema.extend({ count: countSchema })),
  });

const publicDateBucketSchema = z.object({
  date: z.string(),
  start: z.string(),
  end: z.string(),
  percentage: percentageSchema,
});
const publicHourBucketSchema = z.object({
  hour: z.number().int().min(0).max(23),
  percentage: percentageSchema,
});
const publicAnalysisDateFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("date"),
  temporalType: z.enum(["date", "datetime"]),
  timeDetail: z.enum(["none", "hourOfDay", "dayHour"]),
  bucketUnit: z.enum(["day", "week", "month", "quarter", "year"]),
  distribution: z.array(publicDateBucketSchema),
  hourDistribution: z.array(publicHourBucketSchema).optional(),
});
const analysisDateFieldSchema = publicAnalysisDateFieldSchema
  .extend(analysisFieldCountsSchema.shape)
  .extend({
    temporalMeaning: z.enum(["distribution", "event"]),
    timezone: z.literal("UTC"),
    minimum: z.string().nullable(),
    maximum: z.string().nullable(),
    includeEmptyBuckets: z.boolean(),
    distribution: z.array(publicDateBucketSchema.extend({ count: countSchema })),
    hourDistribution: z.array(publicHourBucketSchema.extend({ count: countSchema })).optional(),
  });

export const questionnaireAnalysisFieldDtoSchema = z.discriminatedUnion("kind", [
  analysisChoiceFieldSchema,
  analysisBooleanFieldSchema,
  analysisNumberFieldSchema,
  analysisDateFieldSchema,
]);

export const publicQuestionnaireAnalysisFieldDtoSchema = z.discriminatedUnion("kind", [
  publicAnalysisChoiceFieldSchema,
  publicAnalysisBooleanFieldSchema,
  publicAnalysisNumberFieldSchema,
  publicAnalysisDateFieldSchema,
]);

export const publicQuestionnaireAnalysisDtoSchema = z.object({
  analysisVersion: z.literal(1),
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  homeVariant: questionnaireHomeVariantSchema,
  descriptionRich: z.unknown().nullable(),
  closedAt: z.string().datetime({ offset: true }),
  fields: z.array(publicQuestionnaireAnalysisFieldDtoSchema),
});

export type PublicQuestionnaireDto = z.infer<typeof publicQuestionnaireDtoSchema>;
export type PublicQuestionnaireAnalysisDto = z.infer<typeof publicQuestionnaireAnalysisDtoSchema>;
export type PublicQuestionnaireAnalysisFieldDto = z.infer<
  typeof publicQuestionnaireAnalysisFieldDtoSchema
>;
export type QuestionnaireAnalysisFieldDto = z.infer<typeof questionnaireAnalysisFieldDtoSchema>;
export type QuestionnaireFieldAudienceDto = z.infer<typeof questionnaireFieldAudienceDtoSchema>;
export type QuestionnaireDescribedRuleDto = z.infer<typeof questionnaireDescribedRuleDtoSchema>;
