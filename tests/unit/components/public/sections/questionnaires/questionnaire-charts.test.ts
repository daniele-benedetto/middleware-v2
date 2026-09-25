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
