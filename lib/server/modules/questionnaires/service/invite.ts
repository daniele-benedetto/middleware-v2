import "server-only";

import { getEstimatedMinutes } from "@/lib/questionnaires/flow";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
} from "@/lib/server/modules/questionnaires/schema";

import type { PublicQuestionnaireInviteDto } from "@/lib/server/modules/questionnaires/dto/invite";
import type { QuestionnaireDefinition } from "@/lib/server/modules/questionnaires/schema";

export type QuestionnaireInviteRecord = {
  id: string;
  title: string;
  titleStyled?: unknown;
  slug: string;
  descriptionRich: unknown;
  homeVariant?: unknown;
  definition: unknown;
  status: string;
};

function countQuestions(definition: QuestionnaireDefinition) {
  return definition.steps
    .flatMap((step) => step.fields)
    .filter((field) => field.type !== "information").length;
}

export function toPublicQuestionnaireInvite(
  record: QuestionnaireInviteRecord,
): PublicQuestionnaireInviteDto | null {
  if (record.status !== "PUBLISHED") return null;

  const definition = questionnaireDefinitionSchema.safeParse(record.definition);
  const titleStyled = issueTitleStyledSchema.nullable().safeParse(record.titleStyled ?? null);
  const homeVariant = questionnaireHomeVariantSchema.safeParse(record.homeVariant ?? "black");
  if (!definition.success || !titleStyled.success || !homeVariant.success) return null;

  return {
    id: record.id,
    title: record.title,
    titleStyled: titleStyled.data,
    slug: record.slug,
    description: extractPlainText(record.descriptionRich)?.trim() || null,
    homeVariant: homeVariant.data,
    questionCount: countQuestions(definition.data),
    estimatedMinutes: getEstimatedMinutes(definition.data),
  };
}
