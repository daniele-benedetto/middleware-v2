import { i18n } from "@/lib/i18n";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";
import {
  getQuestionnaireOtherLabel,
  isQuestionnaireOtherAnswer,
} from "@/lib/server/modules/questionnaires/schema/definition";

type CsvResponse = {
  id: string;
  schemaVersion: number;
  definitionSnapshot: unknown;
  answers: Record<string, unknown>;
  submittedAt: Date;
};

type CsvColumn = { id: string; label: string; options?: Map<string, string>; otherLabel?: string };

function escapeSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: unknown) {
  const text = escapeSpreadsheetFormula(String(value ?? ""));
  return `"${text.replaceAll('"', '""')}"`;
}

/** Option label, or `Altro: free text` for the "Altro (specificare)" variant of a choice answer. */
function formatAnswerValue(value: unknown, column: CsvColumn) {
  if (isQuestionnaireOtherAnswer(value)) return `${column.otherLabel}: ${value.other}`;
  return column.options?.get(String(value)) ?? String(value ?? "");
}

/** Unanswered fields, including the ones hidden by a `visibleWhen` condition, are empty cells. */
function formatAnswer(value: unknown, column: CsvColumn) {
  if (Array.isArray(value)) {
    return value.map((item) => formatAnswerValue(item, column)).join(" | ");
  }
  return formatAnswerValue(value, column);
}

function getColumns(responses: CsvResponse[]) {
  const columns = new Map<string, CsvColumn>();

  for (const response of responses) {
    const definition = questionnaireDefinitionSchema.parse(response.definitionSnapshot);
    for (const step of definition.steps) {
      for (const field of step.fields) {
        if (field.type === "information" || columns.has(field.id)) continue;
        const isChoice = field.type === "singleChoice" || field.type === "multipleChoice";
        const options = isChoice
          ? new Map(field.options.map((option) => [option.id, option.label]))
          : undefined;
        columns.set(field.id, {
          id: field.id,
          label: `${step.title ?? i18n.cms.forms.resources.questionnaires.stepFallback(1)} · ${field.label}`,
          options,
          otherLabel: isChoice ? getQuestionnaireOtherLabel(field) : undefined,
        });
      }
    }
  }

  return [...columns.values()];
}

export function createQuestionnaireResponsesCsv(responses: CsvResponse[]) {
  const columns = getColumns(responses);
  const header = [
    i18n.cms.forms.resources.questionnaires.csv.responseId,
    i18n.cms.forms.resources.questionnaires.csv.submittedAt,
    i18n.cms.forms.resources.questionnaires.csv.schemaVersion,
    ...columns.map((column) => column.label),
  ];
  const rows = responses.map((response) => [
    response.id,
    response.submittedAt.toISOString(),
    response.schemaVersion,
    ...columns.map((column) => formatAnswer(response.answers[column.id], column)),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}
