import "server-only";

import { QUESTIONNAIRE_SUMMARY_TIMEZONE } from "@/lib/server/modules/questionnaires/dto/summary";
import {
  getQuestionnaireOtherMaxLength,
  isQuestionnaireOtherAnswer,
} from "@/lib/server/modules/questionnaires/schema/definition";
import { aggregateQuestionnaireAnalysisField } from "@/lib/server/modules/questionnaires/service/analysis";

import type {
  QuestionnaireSummaryFieldDto,
  QuestionnaireSummaryTimelineDto,
} from "@/lib/server/modules/questionnaires/dto/summary";
import type {
  QuestionnaireDefinition,
  QuestionnaireField,
} from "@/lib/server/modules/questionnaires/schema";
import type { QuestionnaireChoiceField } from "@/lib/server/modules/questionnaires/schema/definition";

export type SummaryResponseRecord = { id: string; answers: unknown; submittedAt: Date };

const FREE_TEXT_FIELD_TYPES = ["text", "textarea", "email", "phone", "url"] as const;

export type FreeTextQuestionnaireField = Extract<
  QuestionnaireField,
  { type: (typeof FREE_TEXT_FIELD_TYPES)[number] }
>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: QUESTIONNAIRE_SUMMARY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day (`YYYY-MM-DD`) of an instant in the summary timezone. */
export function toSummaryDayKey(date: Date) {
  return dayKeyFormatter.format(date);
}

function nextDayKey(dayKey: string) {
  return new Date(Date.parse(`${dayKey}T00:00:00.000Z`) + MS_PER_DAY).toISOString().slice(0, 10);
}

/** Responses per calendar day, from the first to the last response day, gaps filled with 0. */
export function createResponsesTimeline(submittedAt: Date[]): QuestionnaireSummaryTimelineDto {
  const counts = new Map<string, number>();
  for (const date of submittedAt) {
    const key = toSummaryDayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys = [...counts.keys()].sort();
  const days: QuestionnaireSummaryTimelineDto["days"] = [];
  const last = keys.at(-1);
  let cumulative = 0;

  for (let key = keys[0]; key !== undefined && last !== undefined && key <= last; ) {
    const count = counts.get(key) ?? 0;
    cumulative += count;
    days.push({ date: key, count, cumulative });
    key = nextDayKey(key);
  }

  return { timezone: QUESTIONNAIRE_SUMMARY_TIMEZONE, days };
}

export function isFreeTextQuestionnaireField(
  field: QuestionnaireField,
): field is FreeTextQuestionnaireField {
  return (FREE_TEXT_FIELD_TYPES as readonly string[]).includes(field.type);
}

function getAnswer(response: { answers: unknown }, fieldId: string): unknown {
  const answers = response.answers;
  return answers && typeof answers === "object" && !Array.isArray(answers)
    ? (answers as Record<string, unknown>)[fieldId]
    : undefined;
}

function getFreeTextAnswer(response: { answers: unknown }, fieldId: string) {
  const value = getAnswer(response, fieldId);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sortNewestFirst<T extends { responseId: string; submittedAt: Date }>(items: T[]) {
  return items
    .sort(
      (left, right) =>
        right.submittedAt.getTime() - left.submittedAt.getTime() ||
        right.responseId.localeCompare(left.responseId),
    )
    .map((item) => ({ ...item, submittedAt: item.submittedAt.toISOString() }));
}

/**
 * Free texts of the "Altro" answers of a choice field, newest first.
 * Only texts that are valid for the field (non-empty, within its max length) are listed,
 * i.e. the same answers counted under the synthetic "Altro" option of the analysis.
 */
export function listOtherChoiceAnswers(
  field: QuestionnaireChoiceField,
  responses: SummaryResponseRecord[],
) {
  const maxLength = getQuestionnaireOtherMaxLength(field);
  return sortNewestFirst(
    responses.flatMap((response) => {
      const answer = getAnswer(response, field.id);
      const other = (Array.isArray(answer) ? answer : [answer]).find(isQuestionnaireOtherAnswer);
      const value = other?.other.trim() ?? "";
      return value.length > 0 && value.length <= maxLength
        ? [{ responseId: response.id, submittedAt: response.submittedAt, value }]
        : [];
    }),
  );
}

function summarizeFieldResult(
  field: QuestionnaireField,
  responses: SummaryResponseRecord[],
): Pick<
  QuestionnaireSummaryFieldDto,
  "answeredCount" | "missingCount" | "invalidCount" | "result"
> | null {
  if (isFreeTextQuestionnaireField(field)) {
    const answeredCount = responses.filter(
      (response) => getFreeTextAnswer(response, field.id) !== null,
    ).length;
    return {
      answeredCount,
      missingCount: responses.length - answeredCount,
      invalidCount: 0,
      result: { kind: "text" },
    };
  }

  if (field.type === "consent") {
    const values = responses.map((response) => getAnswer(response, field.id));
    const acceptedCount = values.filter((value) => value === true).length;
    const declinedCount = values.filter((value) => value === false).length;
    const missingCount = values.filter((value) => value === undefined).length;
    const answeredCount = acceptedCount + declinedCount;
    return {
      answeredCount,
      missingCount,
      invalidCount: responses.length - answeredCount - missingCount,
      result: { kind: "consent", acceptedCount, declinedCount },
    };
  }

  const analysis = aggregateQuestionnaireAnalysisField(field, responses);
  if (!analysis) return null;
  return {
    answeredCount: analysis.responseCount,
    missingCount: analysis.missingCount,
    invalidCount: responses.length - analysis.responseCount - analysis.missingCount,
    result: {
      kind: "analysis",
      analysis,
      ...((field.type === "singleChoice" || field.type === "multipleChoice") && field.allowOther
        ? { otherAnswers: listOtherChoiceAnswers(field, responses) }
        : {}),
    },
  };
}

/** Every answerable field in definition order, whatever its `publicResults` flag. */
export function summarizeQuestionnaireFields(
  definition: QuestionnaireDefinition,
  responses: SummaryResponseRecord[],
): QuestionnaireSummaryFieldDto[] {
  return definition.steps.flatMap((step, stepIndex) =>
    step.fields.flatMap((field) => {
      if (field.type === "information") return [];
      const result = summarizeFieldResult(field, responses);
      if (!result) return [];
      return [
        {
          id: field.id,
          type: field.type,
          label: field.label,
          description: field.description ?? null,
          required: field.required,
          publicResults: field.publicResults,
          stepId: step.id,
          stepIndex,
          stepTitle: step.title ?? null,
          ...result,
        },
      ];
    }),
  );
}

export function findQuestionnaireField(definition: QuestionnaireDefinition, fieldId: string) {
  for (const step of definition.steps) {
    const field = step.fields.find((candidate) => candidate.id === fieldId);
    if (field) return { field, stepTitle: step.title ?? null };
  }
  return null;
}

/** Non-empty answers of one free-text field, newest first. */
export function listFreeTextFieldAnswers(fieldId: string, responses: SummaryResponseRecord[]) {
  return sortNewestFirst(
    responses.flatMap((response) => {
      const value = getFreeTextAnswer(response, fieldId);
      return value === null
        ? []
        : [{ responseId: response.id, submittedAt: response.submittedAt, value }];
    }),
  );
}
