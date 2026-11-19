import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AnalysisFieldRenderer } from "@/components/public/sections/questionnaires/charts/analysis-field-renderer";
import { BooleanPieChart } from "@/components/public/sections/questionnaires/charts/boolean-pie-chart";
import {
  CHART_SECONDARY_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/public/sections/questionnaires/charts/chart-colors";
import {
  formatChartPercentage,
  formatChartRange,
  getPercentageAxisMaximum,
} from "@/components/public/sections/questionnaires/charts/chart-format";
import {
  AnalysisChartTooltip,
  ChartTooltipBody,
} from "@/components/public/sections/questionnaires/charts/chart-tooltip";
import { ChoiceBarChart } from "@/components/public/sections/questionnaires/charts/choice-bar-chart";
import { DiscreteDistributionChart } from "@/components/public/sections/questionnaires/charts/discrete-distribution-chart";
import { Histogram } from "@/components/public/sections/questionnaires/charts/histogram";
import { NumericFrequencyArea } from "@/components/public/sections/questionnaires/charts/numeric-frequency-area";

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
    chart: "bar" as const,
    alternatives: ["table" as const],
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

const numericField = {
  ...scaleField,
  fieldType: "decimal" as const,
  numericType: "decimal" as const,
  discrete: false,
  distribution: [
    { minimum: 20, maximum: 25, count: 1, percentage: 20 },
    { minimum: 35, maximum: 40, count: 2, percentage: 40 },
    { minimum: 45, maximum: 50, count: 1, percentage: 20 },
    { minimum: 55, maximum: 60, count: 1, percentage: 20 },
  ],
  visualization: {
    chart: "frequencyArea" as const,
    alternatives: ["table" as const],
    rationale: "numericDistribution" as const,
    methodology: "numeric_distribution" as const,
  },
};

function render(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(element);
}

describe("questionnaire chart primitives", () => {
  it("resolves chart colours from theme tokens instead of generated hues", () => {
    expect(CHART_SERIES_COLOR).toBe("var(--chart-1)");
    expect(CHART_SECONDARY_COLOR).toBe("var(--chart-2)");
  });

  it("formats percentages, ranges and axis bounds", () => {
    expect(formatChartPercentage(66.67)).toBe("66,7%");
    expect(formatChartPercentage(40)).toBe("40%");
    expect(formatChartRange(2, 2)).toBe("2");
    expect(formatChartRange(1.5, 2.25)).toBe("1,5–2,25");
    expect(getPercentageAxisMaximum([12, 33.33])).toBe(40);
    expect(getPercentageAxisMaximum([3])).toBe(10);
    expect(getPercentageAxisMaximum([100])).toBe(100);
    expect(getPercentageAxisMaximum([])).toBe(10);
  });

  it("renders the shared tooltip with label, percentage and count", () => {
    const html = render(
      createElement(ChartTooltipBody, { label: "Prima", percentage: 66.67, count: 2 }),
    );

    expect(html).toContain("Prima");
    expect(html).toContain("Percentuale");
    expect(html).toContain("66,7%");
    expect(html).toContain("Risposte");
    expect(html).toContain(">2<");
  });

  it("omits the count row when the datum has no count and stays hidden when inactive", () => {
    const withoutCount = render(
      createElement(AnalysisChartTooltip, {
        active: true,
        payload: [{ payload: { label: "Prima", percentage: 50 } }],
      }),
    );
    const inactive = render(
      createElement(AnalysisChartTooltip, {
        active: false,
        payload: [{ payload: { label: "Prima", percentage: 50 } }],
      }),
    );

    expect(withoutCount).toContain("50%");
    expect(withoutCount).not.toContain("Risposte");
    expect(inactive).toBe("");
  });

  it.each([
    ["single", choiceField],
    ["multiple", multipleChoiceField],
  ])("renders %s choice as labelled single-colour bars without a legend", (_name, field) => {
    const html = render(createElement(ChoiceBarChart, { field }));

    expect(html).toContain("Distribuzione percentuale delle risposte");
    expect(html).toContain("Prima");
    expect(html).toContain("66,7%");
    expect(html).toContain("Seconda");
    expect(html).toContain("33,3%");
    expect(html).toContain("width:66.67%");
    expect(html).toContain("width:33.33%");
    expect(html).not.toContain("Legenda");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("oklch(");
    expect(html.match(/background-color:var\(--chart-1\)/g)).toHaveLength(2);
  });

  it("keeps the option order it receives", () => {
    const html = render(
      createElement(ChoiceBarChart, {
        field: { ...choiceField, options: [...choiceField.options].reverse() },
      }),
    );

    expect(html.indexOf("Seconda")).toBeLessThan(html.indexOf("Prima"));
  });

  it("uses thinner bars as the number of options grows", () => {
    const options = Array.from({ length: 9 }, (_, index) => ({
      id: `00000000-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`,
      label: `Opzione ${index + 1}`,
      count: 1,
      percentage: 11.11,
      rank: index + 1,
    }));
    const few = render(createElement(ChoiceBarChart, { field: choiceField }));
    const many = render(createElement(ChoiceBarChart, { field: { ...choiceField, options } }));

    expect(few).toContain("h-4");
    expect(many).toContain("h-2");
    expect(many).not.toContain("h-4");
  });

  it("renders both boolean choices with their percentages in two token colours", () => {
    const html = render(createElement(BooleanPieChart, { field: booleanField }));

    expect(html).toContain("Sì, sono d&#x27;accordo");
    expect(html).toContain("No, non sono d&#x27;accordo");
    expect(html).toContain("60%");
    expect(html).toContain("40%");
    expect(html).toContain("var(--chart-1)");
    expect(html).toContain("var(--chart-2)");
    expect(html).not.toContain("truncate");
  });

  it.each([
    ["scale values", DiscreteDistributionChart, scaleField, "Distribuzione dei valori"],
    ["histogram bins", Histogram, numericField, "Distribuzione dei valori per intervallo"],
    ["numeric frequencies", NumericFrequencyArea, numericField, "Distribuzione dei valori"],
  ] as const)("renders %s without a per-bar legend", (_name, Chart, field, label) => {
    const html = render(createElement(Chart, { field }));

    expect(html).toContain(label);
    expect(html).toContain("data-chart");
    expect(html).not.toContain("Legenda");
    expect(html).not.toContain("oklch(");
  });

  it("renders an empty state without chart geometry", () => {
    const html = render(
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
