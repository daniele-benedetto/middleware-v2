import { selectQuestionnaireFieldVisualization } from "@/lib/server/modules/questionnaires/service/visualization";

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "Campo",
  description: null,
  responseCount: 10,
  missingCount: 0,
  visualization: undefined,
} as const;

describe("questionnaire visualization selection", () => {
  it("selects pie for booleans and bar as alternative", () => {
    expect(
      selectQuestionnaireFieldVisualization({
        ...base,
        kind: "boolean",
        trueLabel: "Si",
        falseLabel: "No",
        trueCount: 7,
        falseCount: 3,
      }),
    ).toEqual({
      chart: "pie",
      alternatives: ["bar"],
      rationale: "binaryNominal",
      methodology: "binary_percentage",
    });
  });

  it("uses respondent percentages and never pie for multiple choice", () => {
    const result = selectQuestionnaireFieldVisualization({
      ...base,
      kind: "choice",
      multiple: true,
      options: [],
    });

    expect(result).toEqual({
      chart: "bar",
      alternatives: ["table"],
      rationale: "multipleNominal",
      methodology: "respondent_percentage",
    });
    expect(result.chart).not.toBe("pie");
  });

  it("uses editor-selected integer mode", () => {
    const integerField = {
      ...base,
      kind: "number",
      numericType: "integer",
      integerVisualization: "discrete",
      minimum: 1,
      maximum: 3,
      average: 2,
      median: 2,
      q1: 1,
      q3: 3,
      iqr: 2,
      discrete: true,
      distribution: [],
    } as const;
    const discrete = selectQuestionnaireFieldVisualization(integerField);
    const histogram = selectQuestionnaireFieldVisualization({
      ...integerField,
      integerVisualization: "histogram",
    });

    expect(discrete.chart).toBe("discreteBar");
    expect(histogram.chart).toBe("histogram");
  });

  it("uses dot plot for small numeric samples and table for empty fields", () => {
    const small = selectQuestionnaireFieldVisualization({
      ...base,
      kind: "number",
      numericType: "decimal",
      responseCount: 2,
      minimum: 1,
      maximum: 2,
      average: 1.5,
      median: 1.5,
      q1: 1.25,
      q3: 1.75,
      iqr: 0.5,
      discrete: false,
      distribution: [],
    });
    const empty = selectQuestionnaireFieldVisualization({
      ...{
        ...base,
        kind: "number",
        numericType: "decimal",
        responseCount: 0,
        minimum: null,
        maximum: null,
        average: null,
        median: null,
        q1: null,
        q3: null,
        iqr: null,
        discrete: false,
        distribution: [],
      },
    });

    expect(small.chart).toBe("dotPlot");
    expect(small.alternatives).toEqual(["histogram", "table"]);
    expect(empty).toEqual({
      chart: "table",
      alternatives: [],
      rationale: "emptyData",
      methodology: "no_data",
    });
  });
});
