import "server-only";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
} from "@/lib/server/modules/questionnaires/schema";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";
import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";

type AnalysisRecord = {
  id: string;
  title: string;
  titleStyled?: unknown;
  homeVariant?: unknown;
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

function aggregateNumericDistribution(field: QuestionnaireField, answers: number[]) {
  if (answers.length === 0) return { discrete: field.type === "scale", distribution: [] };

  const counts = new Map<number, number>();
  answers.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const discrete = field.type === "scale" || (field.type === "integer" && counts.size <= 12);

  if (discrete) {
    if (field.type === "scale") {
      for (let value = field.min; value <= field.max; value += field.step ?? 1) {
        if (!counts.has(value)) counts.set(value, 0);
      }
    }

    return {
      discrete,
      distribution: [...counts]
        .sort(([left], [right]) => left - right)
        .map(([value, count]) => ({ minimum: value, maximum: value, count })),
    };
  }

  const minimum = Math.min(...answers);
  const maximum = Math.max(...answers);
  if (minimum === maximum) {
    return { discrete, distribution: [{ minimum, maximum, count: answers.length }] };
  }

  const bucketCount = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(answers.length))));
  const bucketSize = (maximum - minimum) / bucketCount;
  const distribution = Array.from({ length: bucketCount }, (_, index) => ({
    minimum: minimum + bucketSize * index,
    maximum: index === bucketCount - 1 ? maximum : minimum + bucketSize * (index + 1),
    count: 0,
  }));

  answers.forEach((value) => {
    const index = Math.min(bucketCount - 1, Math.floor((value - minimum) / bucketSize));
    distribution[index].count += 1;
  });

  return { discrete, distribution };
}

function dateKey(value: string) {
  return value.length === 10 ? value : new Date(value).toISOString().slice(0, 10);
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function aggregateDateDistribution(answers: string[]) {
  if (answers.length === 0) return [];

  const minimum = answers[0];
  const maximum = answers.at(-1) ?? minimum;
  const spanInDays =
    (new Date(`${dateKey(maximum)}T00:00:00.000Z`).getTime() -
      new Date(`${dateKey(minimum)}T00:00:00.000Z`).getTime()) /
    86_400_000;
  const keyFor = spanInDays <= 31 ? dateKey : spanInDays <= 180 ? startOfWeek : startOfMonth;
  const counts = new Map<string, number>();

  answers.forEach((value) => {
    const key = keyFor(dateKey(value));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
}

function aggregateField(field: QuestionnaireField, records: AnalysisRecord["responses"]) {
  if (!field.publicResults) return null;
  const values = records
    .map((record) => getAnswers(record.answers)[field.id])
    .filter((value) => value !== undefined);
  const base = {
    id: field.id,
    label: field.label,
    description: field.description ?? null,
  };

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
    return {
      ...base,
      kind: "number" as const,
      responseCount: answers.length,
      minimum: answers.length ? Math.min(...answers) : null,
      maximum: answers.length ? Math.max(...answers) : null,
      average: answers.length
        ? answers.reduce((sum, value) => sum + value, 0) / answers.length
        : null,
      ...aggregateNumericDistribution(field, answers),
    };
  }

  if (field.type === "date" || field.type === "datetime") {
    const answers = values
      .filter(
        (value): value is string =>
          typeof value === "string" && Number.isFinite(new Date(value).getTime()),
      )
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
    return {
      ...base,
      kind: "date" as const,
      responseCount: answers.length,
      minimum: answers[0] ?? null,
      maximum: answers.at(-1) ?? null,
      distribution: aggregateDateDistribution(answers),
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
    titleStyled:
      record.titleStyled === null || record.titleStyled === undefined
        ? null
        : issueTitleStyledSchema.parse(record.titleStyled),
    homeVariant: questionnaireHomeVariantSchema.parse(record.homeVariant ?? "black"),
    descriptionRich: record.descriptionRich ?? null,
    closedAt: record.closedAt.toISOString(),
    responseCount: record._count.responses,
    fields,
  };
}
