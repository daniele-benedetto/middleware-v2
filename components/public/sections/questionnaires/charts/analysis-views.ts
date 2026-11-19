import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

export type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];
export type AnalysisView = AnalysisField["visualization"]["chart"];

const renderableViewsByKind: Record<AnalysisField["kind"], readonly AnalysisView[]> = {
  boolean: ["pie", "table"],
  choice: ["bar", "table"],
  number: ["discreteBar", "histogram", "frequencyArea", "table"],
  date: ["temporalBar", "table"],
};

/**
 * Views offered for a field: the recommended chart first, then its alternatives,
 * limited to what the renderer supports for the field kind. The table is always
 * available because it is the accessible fallback of every chart.
 */
export function getAnalysisViews(field: AnalysisField): AnalysisView[] {
  const renderable = renderableViewsByKind[field.kind];
  const candidates: AnalysisView[] = [
    field.visualization.chart,
    ...field.visualization.alternatives,
    "table",
  ];
  return candidates.filter(
    (view, index) => renderable.includes(view) && candidates.indexOf(view) === index,
  );
}

export function resolveAnalysisView(field: AnalysisField, requested?: AnalysisView): AnalysisView {
  const views = getAnalysisViews(field);
  return requested && views.includes(requested) ? requested : (views[0] ?? "table");
}
