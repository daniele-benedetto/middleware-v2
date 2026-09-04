import { z } from "zod";

import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";

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

export type PublicQuestionnaireDto = z.infer<typeof publicQuestionnaireDtoSchema>;
