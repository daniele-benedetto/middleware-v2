import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AnalysisFieldRenderer } from "@/components/public/sections/questionnaires/charts/analysis-field-renderer";

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

describe("questionnaire chart primitives", () => {
  it("renders chart data", () => {
    const html = renderToStaticMarkup(createElement(AnalysisFieldRenderer, { field: choiceField }));

    expect(html).toContain("data-chart");
    expect(html).not.toContain("Tabella dati");
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
