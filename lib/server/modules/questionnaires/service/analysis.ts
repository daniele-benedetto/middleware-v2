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
  getQuestionnaireOtherLabel,
  QUESTIONNAIRE_OTHER_OPTION_ID,
} from "@/lib/server/modules/questionnaires/schema/definition";
import {
  calculateMean,
  calculateMedian,
  calculatePercentage,
  calculateQuartiles,
  createHourlyDistribution,
  createNumericDistribution,
  createTemporalDistribution,
  roundStatistic,
} from "@/lib/server/modules/questionnaires/service/statistics";
import { selectQuestionnaireFieldVisualization } from "@/lib/server/modules/questionnaires/service/visualization";
import { parseOutput } from "@/lib/server/validation/output";

import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";
import type { QuestionnaireChoiceAnswerValue } from "@/lib/server/modules/questionnaires/schema/definition";

export type AnalysisResponseRecord = { answers: unknown };

type AnalysisRecord = {
  id: string;
  title: string;
  titleStyled?: unknown;
  homeVariant?: unknown;
  descriptionRich: unknown;
  closedAt: Date | null;
  definition: unknown;
  responses: AnalysisResponseRecord[];
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
  records: AnalysisResponseRecord[],
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

const ANALYSIS_FIELD_TYPES = [
  "boolean",
  "singleChoice",
  "multipleChoice",
  "scale",
  "integer",
  "decimal",
  "date",
  "datetime",
] as const;

type AnalysisFieldType = (typeof ANALYSIS_FIELD_TYPES)[number];
type AnalysisSourceField = Extract<QuestionnaireField, { type: AnalysisFieldType }>;

/** Field types that can be aggregated into a chart/table, whatever their `publicResults` flag. */
export function isQuestionnaireAnalysisField(
  field: QuestionnaireField,
): field is AnalysisSourceField {
  return (ANALYSIS_FIELD_TYPES as readonly string[]).includes(field.type);
}

function createBase(field: AnalysisSourceField, values: ParsedFieldValues) {
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
    const selected = (
      field.type === "multipleChoice" ? value : [value]
    ) as QuestionnaireChoiceAnswerValue[];
    for (const item of selected) {
      // Every "Altro" answer, whatever its free text, is counted under one synthetic option.
      const optionId = typeof item === "string" ? item : QUESTIONNAIRE_OTHER_OPTION_ID;
      counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
    }
  }

  const sourceOptions = [
    ...field.options.map((option) => ({ id: option.id, label: option.label })),
    ...(field.allowOther
      ? [
          {
            id: QUESTIONNAIRE_OTHER_OPTION_ID,
            label: getQuestionnaireOtherLabel(field),
            isOther: true as const,
          },
        ]
      : []),
  ];
  const counted = sourceOptions.map((option, index) => ({
    ...option,
    count: counts.get(option.id) ?? 0,
    percentage: calculatePercentage(counts.get(option.id) ?? 0, parsed.values.length),
    definitionIndex: index,
  }));
  const byFrequency = [...counted].sort(
    (left, right) => right.count - left.count || left.definitionIndex - right.definitionIndex,
  );
  const rankByOptionId = new Map(byFrequency.map((option, index) => [option.id, index + 1]));
  const resultsOrder = field.resultsOrder ?? "frequency";
  const options = (resultsOrder === "definition" ? counted : byFrequency).map(
    ({ definitionIndex: _definitionIndex, ...option }) => ({
      ...option,
      rank: rankByOptionId.get(option.id) ?? 1,
    }),
  );

  return {
    ...createBase(field, parsed),
    kind: "choice" as const,
    multiple: field.type === "multipleChoice",
    resultsOrder,
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
    ...(field.type === "integer"
      ? { integerVisualization: field.integerVisualization ?? ("discrete" as const) }
      : {}),
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
  const temporal = createTemporalDistribution(answers, field.temporalMeaning);
  const sorted = [...answers].sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime(),
  );

  return {
    ...createBase(field, parsed),
    kind: "date" as const,
    temporalType: field.type,
    temporalMeaning: field.temporalMeaning,
    timeDetail: field.timeDetail,
    timezone: "UTC" as const,
    minimum: sorted[0] ?? null,
    maximum: sorted.at(-1) ?? null,
    ...temporal,
    ...(field.type === "datetime" && field.timeDetail === "hourOfDay"
      ? { hourDistribution: createHourlyDistribution(answers) }
      : {}),
  };
}

function aggregateField(field: QuestionnaireField, records: AnalysisResponseRecord[]) {
  if (!isQuestionnaireAnalysisField(field)) return null;
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

/**
 * Aggregate + visualization of one field, in the public analysis field shape.
 * Ignores `publicResults`: callers decide which fields they are allowed to expose.
 * Returns null for field types that cannot be aggregated (free text, consent, information).
 */
export function aggregateQuestionnaireAnalysisField(
  field: QuestionnaireField,
  records: AnalysisResponseRecord[],
) {
  const aggregate = aggregateField(field, records);
  if (!aggregate) return null;
  return { ...aggregate, visualization: selectQuestionnaireFieldVisualization(aggregate) };
}

export function toPublicQuestionnaireAnalysis(
  record: AnalysisRecord,
): PublicQuestionnaireAnalysisDto | null {
  if (!record.closedAt) return null;
  const definition = questionnaireDefinitionSchema.parse(record.definition);
  const fields = definition.steps
    .flatMap((step) => step.fields)
    .filter((field) => field.publicResults)
    .map((field) => aggregateQuestionnaireAnalysisField(field, record.responses))
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
