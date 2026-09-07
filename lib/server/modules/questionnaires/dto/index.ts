import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireStatusSchema,
} from "@/lib/server/modules/questionnaires/schema";

export const questionnaireDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  status: questionnaireStatusSchema,
  publishedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  firstResponseAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  responseCount: z.number().int().nonnegative(),
});
export const questionnaireDetailDtoSchema = questionnaireDtoSchema.extend({
  descriptionRich: z.unknown().nullable(),
  definition: questionnaireDefinitionSchema,
});
export const questionnairesListDtoSchema = z.array(questionnaireDtoSchema);
export const questionnaireResponseDtoSchema = z.object({
  id: z.string().uuid(),
  questionnaireId: z.string().uuid(),
  schemaVersion: z.number().int(),
  submittedAt: z.string(),
});
export const questionnaireResponseDetailDtoSchema = questionnaireResponseDtoSchema.extend({
  definitionSnapshot: questionnaireDefinitionSchema,
  answers: z.record(z.string(), z.unknown()),
});
export const questionnaireResponsesListDtoSchema = z.array(questionnaireResponseDtoSchema);
export const questionnaireResponsesCsvDtoSchema = z.object({
  filename: z.string().min(1),
  content: z.string(),
});
