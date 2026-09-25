import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
  publicVisualizationSchema,
} from "@/lib/server/modules/questionnaires/schema";

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
  missingCount: z.number().int().nonnegative(),
  visualization: publicVisualizationSchema,
});

const publicAnalysisChoiceFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("choice"),
  multiple: z.boolean(),
  options: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
      rank: z.number().int().positive(),
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
  minimum: z.string().nullable(),
  maximum: z.string().nullable(),
  bucketUnit: z.enum(["day", "week", "month"]),
  distribution: z.array(
    z.object({
      date: z.string(),
      start: z.string(),
      end: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
    }),
  ),
});

export const publicQuestionnaireAnalysisDtoSchema = z.object({
  analysisVersion: z.literal(1),
  id: z.string().uuid(),
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
