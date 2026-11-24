import {
  describeQuestionnaireRule,
  getQuestionnaireOtherLabel,
  resolveQuestionnaireLogic,
} from "@/lib/server/modules/questionnaires/schema/definition";

import type { QuestionnaireFieldAudienceDto } from "@/lib/server/modules/questionnaires/dto/public";
import type {
  QuestionnaireDefinition,
  QuestionnaireField,
} from "@/lib/server/modules/questionnaires/schema";

function getAnswers(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function createQuestionnaireFieldAudiences(
  definition: QuestionnaireDefinition,
  responses: ReadonlyArray<{ answers: unknown }>,
): Map<string, QuestionnaireFieldAudienceDto> {
  const fields = new Map<string, QuestionnaireField>(
    definition.steps.flatMap((step) => step.fields).map((field) => [field.id, field]),
  );
  const shownCounts = new Map<string, number>();
  for (const response of responses) {
    const logic = resolveQuestionnaireLogic(definition, getAnswers(response.answers));
    for (const fieldId of logic.visibleFieldIds) {
      shownCounts.set(fieldId, (shownCounts.get(fieldId) ?? 0) + 1);
    }
  }

  const audiences = new Map<string, QuestionnaireFieldAudienceDto>();
  const endRules: QuestionnaireFieldAudienceDto["rules"] = [];

  for (const step of definition.steps) {
    for (const field of step.fields) {
      const rules = [step.visibleWhen, field.visibleWhen].flatMap((rule) =>
        rule ? [describeQuestionnaireRule(rule, fields, getQuestionnaireOtherLabel)] : [],
      );
      const optionsCanAllHide =
        (field.type === "singleChoice" || field.type === "multipleChoice") &&
        !field.allowOther &&
        field.options.length > 0 &&
        field.options.every((option) => option.visibleWhen !== undefined);
      if (rules.length === 0 && endRules.length === 0 && !optionsCanAllHide) continue;

      audiences.set(field.id, {
        shownCount: shownCounts.get(field.id) ?? 0,
        totalCount: responses.length,
        rules,
        ...(endRules.length > 0 ? { endRules: [...endRules] } : {}),
      });
    }
    if (step.endWhen) {
      endRules.push(describeQuestionnaireRule(step.endWhen, fields, getQuestionnaireOtherLabel));
    }
  }

  return audiences;
}
