import {
  getQuestionnaireOtherLabel,
  isQuestionnaireOtherAnswer,
} from "@/lib/server/modules/questionnaires/schema/definition";

import type { RouterOutputs } from "@/lib/trpc/types";

type QuestionnaireDefinition = RouterOutputs["questionnaires"]["getById"]["definition"];
export type QuestionnaireField = QuestionnaireDefinition["steps"][number]["fields"][number];

export type ResponseAnswerLabels = {
  answerMissing: string;
  answerYes: string;
  answerNo: string;
  invalidValue: string;
};

const KEY_COLUMN_FIELD_TYPES: ReadonlySet<QuestionnaireField["type"]> = new Set([
  "integer",
  "decimal",
  "scale",
  "boolean",
  "date",
  "datetime",
  "singleChoice",
  "multipleChoice",
]);

export const RESPONSE_KEY_COLUMN_LIMIT = 3;

export function formatResponseDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Rome",
      });
}

type ChoiceField = Extract<QuestionnaireField, { type: "singleChoice" | "multipleChoice" }>;

function formatChoiceValue(value: unknown, field: ChoiceField, labels: ResponseAnswerLabels) {
  if (isQuestionnaireOtherAnswer(value)) {
    return `${getQuestionnaireOtherLabel(field)}: ${value.other}`;
  }
  return field.options.find((option) => option.id === value)?.label ?? labels.invalidValue;
}

export function formatResponseAnswer(
  value: unknown,
  field: QuestionnaireField,
  labels: ResponseAnswerLabels,
) {
  if (value === undefined || value === null || value === "") return labels.answerMissing;
  if (field.type === "boolean" || field.type === "consent")
    return value === true ? labels.answerYes : labels.answerNo;
  if (
    field.type === "singleChoice" &&
    (typeof value === "string" || isQuestionnaireOtherAnswer(value))
  )
    return formatChoiceValue(value, field, labels);
  if (field.type === "multipleChoice" && Array.isArray(value))
    return value.map((entry) => formatChoiceValue(entry, field, labels)).join(", ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return labels.invalidValue;
}

export function selectResponseKeyFields(
  definition: QuestionnaireDefinition,
  limit = RESPONSE_KEY_COLUMN_LIMIT,
): QuestionnaireField[] {
  return definition.steps
    .flatMap((step) => step.fields)
    .filter((field) => KEY_COLUMN_FIELD_TYPES.has(field.type))
    .slice(0, limit);
}
