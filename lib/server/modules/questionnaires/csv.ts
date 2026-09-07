import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";

type CsvResponse = {
  id: string;
  schemaVersion: number;
  definitionSnapshot: unknown;
  answers: Record<string, unknown>;
  submittedAt: Date;
};

type CsvColumn = { id: string; label: string; options?: Map<string, string> };

function escapeSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: unknown) {
  const text = escapeSpreadsheetFormula(String(value ?? ""));
  return `"${text.replaceAll('"', '""')}"`;
}

function formatAnswer(value: unknown, options?: Map<string, string>) {
  if (Array.isArray(value)) {
    return value.map((item) => options?.get(String(item)) ?? String(item)).join(" | ");
  }
  return options?.get(String(value)) ?? String(value ?? "");
}

function getColumns(responses: CsvResponse[]) {
  const columns = new Map<string, CsvColumn>();

  for (const response of responses) {
    const definition = questionnaireDefinitionSchema.parse(response.definitionSnapshot);
    for (const step of definition.steps) {
      for (const field of step.fields) {
        if (field.type === "information" || columns.has(field.id)) continue;
        const options =
          field.type === "singleChoice" || field.type === "multipleChoice"
            ? new Map(field.options.map((option) => [option.id, option.label]))
            : undefined;
        columns.set(field.id, {
          id: field.id,
          label: `${step.title ?? "Step"} · ${field.label}`,
          options,
        });
      }
    }
  }

  return [...columns.values()];
}

export function createQuestionnaireResponsesCsv(responses: CsvResponse[]) {
  const columns = getColumns(responses);
  const header = [
    "Response ID",
    "Submitted at",
    "Schema version",
    ...columns.map((column) => column.label),
  ];
  const rows = responses.map((response) => [
    response.id,
    response.submittedAt.toISOString(),
    response.schemaVersion,
    ...columns.map((column) => formatAnswer(response.answers[column.id], column.options)),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}
