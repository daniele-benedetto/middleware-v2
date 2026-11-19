import {
  chartKindSchema,
  MIN_CHART_SAMPLE_SIZE,
} from "@/lib/server/modules/questionnaires/schema/visualization";
import { selectQuestionnaireFieldVisualization } from "@/lib/server/modules/questionnaires/service/visualization";

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "Campo",
  description: null,
  responseCount: 10,
  missingCount: 0,
  visualization: undefined,
} as const;

const booleanField = {
  ...base,
  kind: "boolean",
  trueLabel: "Si",
  falseLabel: "No",
  trueCount: 7,
  falseCount: 3,
} as const;

const choiceField = { ...base, kind: "choice", multiple: false, options: [] } as const;

const bins = [
  { minimum: 1, maximum: 2, count: 4, percentage: 40 },
  { minimum: 2, maximum: 3, count: 6, percentage: 60 },
];

const numberField = {
  ...base,
  kind: "number",
  minimum: 1,
  maximum: 3,
  average: 2,
  median: 2,
  q1: 1,
  q3: 3,
  iqr: 2,
  discrete: false,
  distribution: bins,
} as const;

const dateField = { ...base, kind: "date", distribution: [] } as const;

describe("questionnaire visualization selection", () => {
  it("exposes a minimum chart sample of five valid responses", () => {
    expect(MIN_CHART_SAMPLE_SIZE).toBe(5);
  });

  it("no longer offers the unreachable dot plot", () => {
    expect(chartKindSchema.options).toEqual([
      "pie",
      "bar",
      "discreteBar",
      "histogram",
      "frequencyArea",
      "temporalBar",
      "table",
    ]);
  });

  it("selects pie for booleans and bar as alternative", () => {
    expect(selectQuestionnaireFieldVisualization(booleanField)).toEqual({
      chart: "pie",
      alternatives: ["bar"],
      rationale: "binaryNominal",
      methodology: "binary_percentage",
    });
  });

  it("selects bars for single and multiple choice, never pie", () => {
    expect(selectQuestionnaireFieldVisualization(choiceField)).toEqual({
      chart: "bar",
      alternatives: ["table"],
      rationale: "singleNominal",
      methodology: "category_percentage",
    });
    expect(selectQuestionnaireFieldVisualization({ ...choiceField, multiple: true })).toEqual({
      chart: "bar",
      alternatives: ["table"],
      rationale: "multipleNominal",
      methodology: "respondent_percentage",
    });
  });

  it("selects discrete bars for scales", () => {
    expect(
      selectQuestionnaireFieldVisualization({
        ...numberField,
        numericType: "scale",
        discrete: true,
      }),
    ).toEqual({
      chart: "discreteBar",
      alternatives: ["table"],
      rationale: "ordinalDiscrete",
      methodology: "ordinal_distribution",
    });
  });

  it("keeps the frequency area for discrete integers", () => {
    const explicit = selectQuestionnaireFieldVisualization({
      ...numberField,
      numericType: "integer",
      integerVisualization: "discrete",
      discrete: true,
    });
    const implicit = selectQuestionnaireFieldVisualization({
      ...numberField,
      numericType: "integer",
      discrete: true,
    });

    expect(explicit).toEqual({
      chart: "frequencyArea",
      alternatives: ["table"],
      rationale: "integerDiscrete",
      methodology: "numeric_distribution",
    });
    expect(implicit).toEqual(explicit);
  });

  it("selects a histogram for integers configured as histogram and for decimals", () => {
    const expected = {
      chart: "histogram",
      alternatives: ["table"],
      rationale: "numericDistribution",
      methodology: "numeric_distribution",
    };

    expect(
      selectQuestionnaireFieldVisualization({
        ...numberField,
        numericType: "integer",
        integerVisualization: "histogram",
      }),
    ).toEqual(expected);
    expect(
      selectQuestionnaireFieldVisualization({ ...numberField, numericType: "decimal" }),
    ).toEqual(expected);
  });

  it("prefers the table when binned values collapse into a single bin", () => {
    expect(
      selectQuestionnaireFieldVisualization({
        ...numberField,
        numericType: "decimal",
        distribution: [{ minimum: 2, maximum: 2, count: 10, percentage: 100 }],
      }),
    ).toMatchObject({ chart: "table", alternatives: ["histogram"] });
  });

  it("selects the temporal bar for dates", () => {
    expect(selectQuestionnaireFieldVisualization(dateField)).toEqual({
      chart: "temporalBar",
      alternatives: ["table"],
      rationale: "temporalDistribution",
      methodology: "temporal_distribution",
    });
  });

  describe("below the minimum sample", () => {
    const small = { responseCount: MIN_CHART_SAMPLE_SIZE - 1 };

    it.each([
      ["boolean", { ...booleanField, ...small }, ["pie", "bar"]],
      ["single choice", { ...choiceField, ...small }, ["bar"]],
      ["multiple choice", { ...choiceField, multiple: true, ...small }, ["bar"]],
      ["scale", { ...numberField, numericType: "scale", ...small }, ["discreteBar"]],
      ["integer", { ...numberField, numericType: "integer", ...small }, ["frequencyArea"]],
      ["decimal", { ...numberField, numericType: "decimal", ...small }, ["histogram"]],
      ["date", { ...dateField, ...small }, ["temporalBar"]],
    ] as const)("leads with the table for %s fields", (_name, field, alternatives) => {
      const normal = selectQuestionnaireFieldVisualization({
        ...field,
        responseCount: MIN_CHART_SAMPLE_SIZE,
      });
      const result = selectQuestionnaireFieldVisualization(field);

      expect(result.chart).toBe("table");
      expect(result.alternatives).toEqual(alternatives);
      expect(result.rationale).toBe(normal.rationale);
      expect(result.methodology).toBe(normal.methodology);
      expect(normal.chart).toBe(alternatives[0]);
    });
  });

  it("returns an empty table without alternatives when there are no responses", () => {
    expect(selectQuestionnaireFieldVisualization({ ...numberField, responseCount: 0 })).toEqual({
      chart: "table",
      alternatives: [],
      rationale: "emptyData",
      methodology: "no_data",
    });
  });
});
