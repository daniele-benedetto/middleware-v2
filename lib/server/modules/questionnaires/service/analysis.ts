import "server-only";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import {
  publicQuestionnaireAnalysisDtoSchema,
  type PublicQuestionnaireAnalysisDto,
} from "@/lib/server/modules/questionnaires/dto/public";
import {
  createQuestionnaireFieldAnswerSchema,
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
} from "@/lib/server/modules/questionnaires/schema";
import {
  calculateMean,
  calculateMedian,
  calculateQuartiles,
  createNumericDistribution,
  createTemporalDistribution,
  roundStatistic,
} from "@/lib/server/modules/questionnaires/service/statistics";
import { parseOutput } from "@/lib/server/validation/output";

import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";

type AnalysisRecord = {
  id: string;
  title: string;
  titleStyled?: unknown;
  homeVariant?: unknown;
  descriptionRich: unknown;
  closedAt: Date | null;
  definition: unknown;
  responses: Array<{ answers: unknown }>;
};

type ParsedFieldValues = {
  values: unknown[];
  missingCount: number;
  invalidCount: number;
};

function getAnswers(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseFieldValues(
  field: QuestionnaireField,
  records: AnalysisRecord["responses"],
): ParsedFieldValues {
  const schema = createQuestionnaireFieldAnswerSchema(field);
  if (!schema) return { values: [], missingCount: records.length, invalidCount: 0 };

  const values: unknown[] = [];
  let missingCount = 0;
  let invalidCount = 0;

  for (const record of records) {
    const value = getAnswers(record.answers)[field.id];
    if (value === undefined) {
      missingCount += 1;
      continue;
    }

    const result = schema.safeParse(value);
    if (result.success) values.push(result.data);
    else invalidCount += 1;
  }

  return { values, missingCount, invalidCount };
}

function isPublicAnalysisField(field: QuestionnaireField) {
  return (
    field.publicResults &&
    [
      "boolean",
      "singleChoice",
      "multipleChoice",
      "scale",
      "integer",
      "decimal",
      "date",
      "datetime",
    ].includes(field.type)
  );
}

function createBase(field: QuestionnaireField, values: ParsedFieldValues) {
  return {
    id: field.id,
    label: field.label,
    description: field.description ?? null,
    fieldType: field.type,
    responseCount: values.values.length,
    missingCount: values.missingCount,
  };
}

function aggregateBoolean(
  field: Extract<QuestionnaireField, { type: "boolean" }>,
  parsed: ParsedFieldValues,
) {
  const answers = parsed.values as boolean[];
  return {
    ...createBase(field, parsed),
    kind: "boolean" as const,
    trueLabel: field.trueLabel,
    falseLabel: field.falseLabel,
    trueCount: answers.filter(Boolean).length,
    falseCount: answers.filter((value) => !value).length,
  };
}

function aggregateChoice(
  field: Extract<QuestionnaireField, { type: "singleChoice" | "multipleChoice" }>,
  parsed: ParsedFieldValues,
) {
  const counts = new Map(field.options.map((option) => [option.id, 0]));
  for (const value of parsed.values) {
    const selected = field.type === "multipleChoice" ? (value as string[]) : [value as string];
    for (const optionId of selected) counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }

  const options = field.options
    .map((option, index) => ({
      id: option.id,
      label: option.label,
      count: counts.get(option.id) ?? 0,
      percentage: 0,
      originalIndex: index,
    }))
    .sort((left, right) => right.count - left.count || left.originalIndex - right.originalIndex)
    .map(({ originalIndex: _originalIndex, ...option }, index) => ({
      ...option,
      percentage:
        parsed.values.length === 0
          ? 0
          : (roundStatistic((option.count / parsed.values.length) * 100) ?? 0),
      rank: index + 1,
    }));

  return {
    ...createBase(field, parsed),
    kind: "choice" as const,
    multiple: field.type === "multipleChoice",
    options,
  };
}

function aggregateNumber(
  field: Extract<QuestionnaireField, { type: "scale" | "integer" | "decimal" }>,
  parsed: ParsedFieldValues,
) {
  const answers = parsed.values as number[];
  const distribution = createNumericDistribution(field, answers);
  const quartiles = calculateQuartiles(answers);

  return {
    ...createBase(field, parsed),
    kind: "number" as const,
    numericType: field.type,
    minimum: answers.length ? roundStatistic(Math.min(...answers)) : null,
    maximum: answers.length ? roundStatistic(Math.max(...answers)) : null,
    average: calculateMean(answers),
    median: calculateMedian(answers),
    ...quartiles,
    ...distribution,
  };
}

function aggregateDate(
  field: Extract<QuestionnaireField, { type: "date" | "datetime" }>,
  parsed: ParsedFieldValues,
) {
  const answers = parsed.values as string[];
  const temporal = createTemporalDistribution(answers);
  const sorted = [...answers].sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime(),
  );

  return {
    ...createBase(field, parsed),
    kind: "date" as const,
    temporalType: field.type,
    minimum: sorted[0] ?? null,
    maximum: sorted.at(-1) ?? null,
    ...temporal,
  };
}

function aggregateField(field: QuestionnaireField, records: AnalysisRecord["responses"]) {
  if (!isPublicAnalysisField(field)) return null;
  const parsed = parseFieldValues(field, records);

  if (field.type === "boolean") return aggregateBoolean(field, parsed);
  if (field.type === "singleChoice" || field.type === "multipleChoice") {
    return aggregateChoice(field, parsed);
  }
  if (field.type === "scale" || field.type === "integer" || field.type === "decimal") {
    return aggregateNumber(field, parsed);
  }
  if (field.type === "date" || field.type === "datetime") return aggregateDate(field, parsed);
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

  return parseOutput(
    {
      analysisVersion: 1,
      id: record.id,
      title: record.title,
      titleStyled:
        record.titleStyled === null || record.titleStyled === undefined
          ? null
          : issueTitleStyledSchema.parse(record.titleStyled),
      homeVariant: questionnaireHomeVariantSchema.parse(record.homeVariant ?? "black"),
      descriptionRich: record.descriptionRich ?? null,
      closedAt: record.closedAt.toISOString(),
      fields,
    },
    publicQuestionnaireAnalysisDtoSchema,
  );
}
