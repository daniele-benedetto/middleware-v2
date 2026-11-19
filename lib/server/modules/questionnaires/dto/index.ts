import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
  questionnaireStatusSchema,
} from "@/lib/server/modules/questionnaires/schema";

export const questionnaireDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  homeVariant: questionnaireHomeVariantSchema,
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
const questionnaireResponseAnswersDtoSchema = z.record(z.string(), z.unknown());
export const questionnaireResponseListItemDtoSchema = questionnaireResponseDtoSchema.extend({
  answers: questionnaireResponseAnswersDtoSchema,
});
export const questionnaireResponseDetailDtoSchema = questionnaireResponseDtoSchema.extend({
  definitionSnapshot: questionnaireDefinitionSchema,
  answers: questionnaireResponseAnswersDtoSchema,
  /** Response submitted immediately before this one (older), null on the first. */
  previousResponseId: z.string().uuid().nullable(),
  /** Response submitted immediately after this one (newer), null on the last. */
  nextResponseId: z.string().uuid().nullable(),
});
export const questionnaireResponsesListDtoSchema = z.array(questionnaireResponseListItemDtoSchema);
export const questionnaireResponsesCsvDtoSchema = z.object({
  filename: z.string().min(1),
  content: z.string(),
});
