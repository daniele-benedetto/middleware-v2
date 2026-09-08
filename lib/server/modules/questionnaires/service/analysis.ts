import "server-only";

import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";
import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";

type AnalysisRecord = {
  id: string;
  title: string;
  descriptionRich: unknown;
  closedAt: Date | null;
  definition: unknown;
  _count: { responses: number };
  responses: Array<{ answers: unknown }>;
};

function getAnswers(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function percentage(count: number, total: number) {
  return total === 0 ? 0 : (count / total) * 100;
}

function aggregateField(field: QuestionnaireField, records: AnalysisRecord["responses"]) {
  if (!field.publicResults) return null;
  const values = records
    .map((record) => getAnswers(record.answers)[field.id])
    .filter((value) => value !== undefined);
  const base = { id: field.id, label: field.label, description: field.description ?? null };

  if (field.type === "boolean") {
    const answers = values.filter((value): value is boolean => typeof value === "boolean");
    return {
      ...base,
      kind: "boolean" as const,
      responseCount: answers.length,
      trueLabel: field.trueLabel,
      falseLabel: field.falseLabel,
      trueCount: answers.filter(Boolean).length,
      falseCount: answers.filter((value) => !value).length,
    };
  }

  if (field.type === "singleChoice" || field.type === "multipleChoice") {
    const counts = new Map(field.options.map((option) => [option.id, 0]));
    let responseCount = 0;
    for (const value of values) {
      const selected = field.type === "multipleChoice" ? value : [value];
      if (!Array.isArray(selected)) continue;
      const ids = selected.filter((id): id is string => typeof id === "string" && counts.has(id));
      if (ids.length === 0) continue;
      responseCount += 1;
      ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    }
    return {
      ...base,
      kind: "choice" as const,
      responseCount,
      multiple: field.type === "multipleChoice",
      options: field.options.map((option) => {
        const count = counts.get(option.id) ?? 0;
        return { label: option.label, count, percentage: percentage(count, responseCount) };
      }),
    };
  }

  if (field.type === "scale" || field.type === "integer" || field.type === "decimal") {
    const answers = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
    const distribution = new Map<number, number>();
    answers.forEach((value) => distribution.set(value, (distribution.get(value) ?? 0) + 1));
    if (field.type === "scale") {
      for (let value = field.min; value <= field.max; value += field.step ?? 1) {
        if (!distribution.has(value)) distribution.set(value, 0);
      }
    }
    return {
      ...base,
      kind: "number" as const,
      responseCount: answers.length,
      minimum: answers.length ? Math.min(...answers) : null,
      maximum: answers.length ? Math.max(...answers) : null,
      average: answers.length
        ? answers.reduce((sum, value) => sum + value, 0) / answers.length
        : null,
      distribution: [...distribution]
        .sort(([left], [right]) => left - right)
        .map(([value, count]) => ({ value, count })),
    };
  }

  if (field.type === "date" || field.type === "datetime") {
    const answers = values
      .filter(
        (value): value is string =>
          typeof value === "string" && Number.isFinite(new Date(value).getTime()),
      )
      .sort();
    return {
      ...base,
      kind: "date" as const,
      responseCount: answers.length,
      minimum: answers[0] ?? null,
      maximum: answers.at(-1) ?? null,
    };
  }

  return null;
}

export function toPublicQuestionnaireAnalysis(
  record: AnalysisRecord,
): PublicQuestionnaireAnalysisDto | null {
  if (!record.closedAt) return null;
  const definition = questionnaireDefinitionSchema.parse(record.definition);
  const fields = definition.steps
    .flatMap((step) => step.fields)
    .map((field) => aggregateField(field, record.responses))
    .filter((field): field is NonNullable<typeof field> => field !== null);

  if (fields.length === 0) return null;
  return {
    id: record.id,
    title: record.title,
    descriptionRich: record.descriptionRich ?? null,
    closedAt: record.closedAt.toISOString(),
    responseCount: record._count.responses,
    fields,
  };
}
