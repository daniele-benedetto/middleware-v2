import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AnalysisFieldRenderer } from "@/components/public/sections/questionnaires/charts/analysis-field-renderer";
import { getGoldenAngleChartColors } from "@/components/public/sections/questionnaires/charts/chart-colors";

const choiceField = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "Quale opzione?",
  description: null,
  fieldType: "singleChoice" as const,
  responseCount: 3,
  missingCount: 1,
  kind: "choice" as const,
  multiple: false,
  options: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      label: "Prima",
      count: 2,
      percentage: 66.67,
      rank: 1,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      label: "Seconda",
      count: 1,
      percentage: 33.33,
      rank: 2,
    },
  ],
  visualization: {
    chart: "bar" as const,
    alternatives: ["table" as const],
    rationale: "singleNominal" as const,
    methodology: "category_percentage" as const,
  },
};

const booleanField = {
  id: "00000000-0000-4000-8000-000000000004",
  label: "Sei d'accordo?",
  description: null,
  fieldType: "boolean" as const,
  responseCount: 10,
  missingCount: 2,
  kind: "boolean" as const,
  trueLabel: "Sì, sono d'accordo",
  falseLabel: "No, non sono d'accordo",
  trueCount: 6,
  falseCount: 4,
  visualization: {
    chart: "pie" as const,
    alternatives: [],
    rationale: "binaryNominal" as const,
    methodology: "binary_percentage" as const,
  },
};

const multipleChoiceField = {
  ...choiceField,
  fieldType: "multipleChoice" as const,
  multiple: true,
  visualization: {
    chart: "table" as const,
    alternatives: ["bar" as const],
    rationale: "multipleNominal" as const,
    methodology: "respondent_percentage" as const,
  },
};

const scaleField = {
  id: "00000000-0000-4000-8000-000000000005",
  label: "Quanto spesso?",
  description: null,
  fieldType: "scale" as const,
  responseCount: 3,
  missingCount: 0,
  kind: "number" as const,
  numericType: "scale" as const,
  minimum: 1,
  maximum: 3,
  average: 2,
  median: 2,
  q1: 1,
  q3: 3,
  iqr: 2,
  distribution: [
    { minimum: 1, maximum: 1, count: 1, percentage: 33.33 },
    { minimum: 2, maximum: 2, count: 1, percentage: 33.33 },
    { minimum: 3, maximum: 3, count: 1, percentage: 33.33 },
  ],
  discrete: true,
  visualization: {
    chart: "discreteBar" as const,
    alternatives: ["table" as const],
    rationale: "ordinalDiscrete" as const,
    methodology: "ordinal_distribution" as const,
  },
};

describe("questionnaire chart primitives", () => {
  it("generates deterministic distinct category colors", () => {
    const keys = ["first", "second", "third"];
    const first = getGoldenAngleChartColors(keys);
    const second = getGoldenAngleChartColors(keys);

    expect(first.get("first")).toBe(second.get("first"));
    expect(new Set(first.values()).size).toBe(3);
    expect(first.get("first")).toMatch(/^oklch\(/);
  });

  it("renders chart data", () => {
    const html = renderToStaticMarkup(createElement(AnalysisFieldRenderer, { field: choiceField }));

    expect(html).toContain("data-chart");
    expect(html).toContain("Prima");
    expect(html).toContain("66.67%");
    expect(html).toContain("Seconda");
    expect(html).toContain("33.33%");
    expect(html).not.toContain("Tabella dati");
  });

  it("renders both boolean choices with their percentages", () => {
    const html = renderToStaticMarkup(
      createElement(AnalysisFieldRenderer, { field: booleanField }),
    );

    expect(html).toContain("Sì, sono d&#x27;accordo");
    expect(html).toContain("No, non sono d&#x27;accordo");
    expect(html).toContain("60%");
    expect(html).toContain("40%");
    expect(html).not.toContain("Risposte");
  });

  it("renders multiple choice results as a radial grid", () => {
    const html = renderToStaticMarkup(
      createElement(AnalysisFieldRenderer, { field: multipleChoiceField }),
    );

    expect(html).toContain("Distribuzione percentuale delle risposte");
    expect(html).toContain("Prima");
    expect(html).toContain("Seconda");
    expect(html).toContain("66.67%");
    expect(html).toContain("33.33%");
  });

  it("renders scale values with a colored legend", () => {
    const html = renderToStaticMarkup(createElement(AnalysisFieldRenderer, { field: scaleField }));

    expect(html).toContain("Legenda dei valori");
    expect(html).toContain("33.33%");
    expect(html).toContain("data-chart");
  });

  it("renders an empty state without chart geometry", () => {
    const html = renderToStaticMarkup(
      createElement(AnalysisFieldRenderer, {
        field: {
          ...choiceField,
          responseCount: 0,
          visualization: {
            chart: "table" as const,
            alternatives: [],
            rationale: "emptyData" as const,
            methodology: "no_data" as const,
          },
        },
      }),
    );

    expect(html).toContain("Nessun dato aggregato disponibile.");
    expect(html).not.toContain("recharts");
  });
});
