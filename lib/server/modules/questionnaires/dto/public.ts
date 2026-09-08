import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
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
  responseCount: z.number().int().nonnegative(),
});

const publicAnalysisChoiceFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("choice"),
  multiple: z.boolean(),
  options: z.array(
    z.object({ label: z.string(), count: z.number().int().nonnegative(), percentage: z.number() }),
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
  minimum: z.number().nullable(),
  maximum: z.number().nullable(),
  average: z.number().nullable(),
  distribution: z.array(
    z.object({
      minimum: z.number(),
      maximum: z.number(),
      count: z.number().int().nonnegative(),
    }),
  ),
  discrete: z.boolean(),
});
const publicAnalysisDateFieldSchema = publicAnalysisFieldBaseSchema.extend({
  kind: z.literal("date"),
  minimum: z.string().nullable(),
  maximum: z.string().nullable(),
  distribution: z.array(z.object({ date: z.string(), count: z.number().int().nonnegative() })),
});

export const publicQuestionnaireAnalysisDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  homeVariant: questionnaireHomeVariantSchema,
  descriptionRich: z.unknown().nullable(),
  closedAt: z.string().datetime({ offset: true }),
  responseCount: z.number().int().nonnegative(),
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
