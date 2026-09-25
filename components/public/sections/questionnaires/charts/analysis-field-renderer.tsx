"use client";

import { i18n } from "@/lib/i18n";

import { BooleanPieChart } from "./boolean-pie-chart";
import { ChartMethodology } from "./chart-methodology";
import { ChartMetrics, defaultResponseMetrics } from "./chart-metrics";
import { ChartTable } from "./chart-table";
import { ChoiceBarChart } from "./choice-bar-chart";
import { DiscreteDistributionChart } from "./discrete-distribution-chart";
import { DotPlot } from "./dot-plot";
import { Histogram } from "./histogram";
import { HourlyBarChart } from "./hourly-bar-chart";
import { TemporalBarChart } from "./temporal-bar-chart";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

function EmptyField({ field }: { field: AnalysisField }) {
  return (
    <div className="py-4">
      <p className="font-editorial text-[17px] text-muted">
        {i18n.public.questionnaireAnalysis.emptyChart}
      </p>
      <ChartTable field={field} />
    </div>
  );
}

export function AnalysisFieldRenderer({ field }: { field: AnalysisField }) {
  if (field.responseCount === 0) {
    return <EmptyField field={field} />;
  }

  const metrics = defaultResponseMetrics(field.responseCount, field.missingCount);
  if (field.kind === "number") {
    metrics.push(
      { label: i18n.public.questionnaireAnalysis.average, value: String(field.average ?? "-") },
      { label: i18n.public.questionnaireAnalysis.median, value: String(field.median ?? "-") },
    );
  }

  return (
    <div className="space-y-4">
      <ChartMetrics metrics={metrics} />
      {field.visualization.chart === "pie" && field.kind === "boolean" ? (
        <BooleanPieChart field={field} />
      ) : field.visualization.chart === "bar" && field.kind === "choice" ? (
        <ChoiceBarChart field={field} />
      ) : field.visualization.chart === "discreteBar" && field.kind === "number" ? (
        <DiscreteDistributionChart field={field} />
      ) : field.visualization.chart === "histogram" && field.kind === "number" ? (
        <Histogram field={field} />
      ) : field.visualization.chart === "dotPlot" && field.kind === "number" ? (
        <DotPlot field={field} />
      ) : field.visualization.chart === "temporalBar" && field.kind === "date" ? (
        field.timeDetail === "hourOfDay" ? (
          <HourlyBarChart field={field} />
        ) : (
          <TemporalBarChart field={field} />
        )
      ) : field.visualization.chart === "table" ? null : (
        <EmptyField field={field} />
      )}
      <ChartMethodology methodology={field.visualization} />
      <ChartTable field={field} />
    </div>
  );
}
