import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  formatAnalysisNumber,
  formatAnalysisPercentage,
  formatAnalysisRange,
} from "@/components/public/sections/questionnaires/analysis-number-format";
import { AnalysisTable } from "@/components/public/sections/questionnaires/analysis-table";

import type {
  AnalysisField,
  AnalysisTableField,
} from "@/components/public/sections/questionnaires/analysis-field";

const publicChoiceField = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "Quale opzione?",
  description: null,
  fieldType: "singleChoice",
  hasResponses: true,
  kind: "choice",
  multiple: false,
  options: [
    { id: "00000000-0000-4000-8000-000000000002", label: "Prima", percentage: 66.67, rank: 1 },
    { id: "00000000-0000-4000-8000-000000000003", label: "Seconda", percentage: 33.33, rank: 2 },
  ],
} satisfies AnalysisField;

const publicBooleanField = {
  id: "00000000-0000-4000-8000-000000000004",
  label: "Sei d'accordo?",
  description: null,
  fieldType: "boolean",
  hasResponses: true,
  kind: "boolean",
  trueLabel: "Sì",
  falseLabel: "No",
  truePercentage: 60,
  falsePercentage: 40,
} satisfies AnalysisField;

const publicNumericField = {
  id: "00000000-0000-4000-8000-000000000005",
  label: "Quanti anni?",
  description: null,
  fieldType: "decimal",
  hasResponses: true,
  kind: "number",
  numericType: "decimal",
  average: 40,
  median: 38,
  discrete: false,
  distribution: [
    { minimum: 20, maximum: 25, percentage: 20 },
    { minimum: 35, maximum: 40, percentage: 80 },
  ],
} satisfies AnalysisField;

const cmsChoiceField = {
  ...publicChoiceField,
  responseCount: 3,
  missingCount: 1,
  options: [
    { ...publicChoiceField.options[0], count: 2 },
    { ...publicChoiceField.options[1], count: 1 },
  ],
} satisfies AnalysisTableField;

function render(field: AnalysisTableField) {
  return renderToStaticMarkup(createElement(AnalysisTable, { field }));
}

describe("questionnaire analysis table", () => {
  it("shows only percentages for public results, never counts", () => {
    const html = render(publicChoiceField);

    expect(html).toContain("<table");
    expect(html).toContain("Tabella dei risultati: Quale opzione?");
    expect(html).toContain("66,7%");
    expect(html).not.toContain("Conteggio");
    expect(html).not.toContain("Risposte valide");
  });

  it("shows counts and valid responses when the CMS passes them", () => {
    const html = render(cmsChoiceField);

    expect(html).toContain("Conteggio");
    expect(html).toContain("Risposte valide");
    expect(html).toContain(">2<");
  });

  it("renders both boolean answers with their percentages", () => {
    const html = render(publicBooleanField);

    expect(html).toContain("Sì");
    expect(html).toContain("60%");
    expect(html).toContain("40%");
  });

  it("labels numeric distributions as intervals", () => {
    const html = render(publicNumericField);

    expect(html).toContain("Intervallo");
    expect(html).toContain("20–25");
  });

  it("renders an empty state instead of a table without responses", () => {
    const html = render({ ...publicChoiceField, hasResponses: false });

    expect(html).toContain("Nessun dato aggregato disponibile.");
    expect(html).not.toContain("<table");
  });

  it("formats numbers, percentages and ranges in Italian", () => {
    expect(formatAnalysisNumber(1234.5)).toBe("1234,5");
    expect(formatAnalysisPercentage(33.333)).toBe("33,3%");
    expect(formatAnalysisRange(2, 2)).toBe("2");
    expect(formatAnalysisRange(1, 3)).toBe("1–3");
  });
});
