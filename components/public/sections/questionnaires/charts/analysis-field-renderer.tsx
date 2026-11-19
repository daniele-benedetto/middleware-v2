"use client";

import { i18n } from "@/lib/i18n";

import { AnalysisTable } from "./analysis-table";
import { resolveAnalysisView, type AnalysisField, type AnalysisView } from "./analysis-views";
import { BooleanPieChart } from "./boolean-pie-chart";
import { ChoiceBarChart } from "./choice-bar-chart";
import { DiscreteDistributionChart } from "./discrete-distribution-chart";
import { Histogram } from "./histogram";
import { HourlyBarChart } from "./hourly-bar-chart";
import { NumericFrequencyArea } from "./numeric-frequency-area";
import { TemporalBarChart } from "./temporal-bar-chart";

function EmptyField() {
  return (
    <div className="py-4">
      <p className="font-editorial text-[17px] text-muted">
        {i18n.public.questionnaireAnalysis.emptyChart}
      </p>
    </div>
  );
}

function AnalysisFieldView({ field, view }: { field: AnalysisField; view: AnalysisView }) {
  if (view === "table") return <AnalysisTable field={field} />;

  if (field.kind === "boolean") {
    return view === "pie" ? <BooleanPieChart field={field} /> : <EmptyField />;
  }
  if (field.kind === "choice") {
    return view === "bar" ? <ChoiceBarChart field={field} /> : <EmptyField />;
  }
  if (field.kind === "number") {
    if (view === "discreteBar") return <DiscreteDistributionChart field={field} />;
    if (view === "histogram") return <Histogram field={field} />;
    if (view === "frequencyArea") return <NumericFrequencyArea field={field} />;
    return <EmptyField />;
  }
  if (view !== "temporalBar") return <EmptyField />;
  return field.timeDetail === "hourOfDay" ? (
    <HourlyBarChart field={field} />
  ) : (
    <TemporalBarChart field={field} />
  );
}

/**
 * Renders one field with the requested view; without `view` (or with one the
 * field cannot use) it falls back to the recommended `visualization.chart`.
 */
export function AnalysisFieldRenderer({
  field,
  view,
}: {
  field: AnalysisField;
  view?: AnalysisView;
}) {
  if (field.responseCount === 0) {
    return <EmptyField />;
  }

  return (
    <div className="space-y-4">
      <AnalysisFieldView field={field} view={resolveAnalysisView(field, view)} />
    </div>
  );
}
