"use client";

import { i18n } from "@/lib/i18n";

import { BooleanPieChart } from "./boolean-pie-chart";
import { ChoiceBarChart } from "./choice-bar-chart";
import { DiscreteDistributionChart } from "./discrete-distribution-chart";
import { DotPlot } from "./dot-plot";
import { Histogram } from "./histogram";
import { HourlyBarChart } from "./hourly-bar-chart";
import { TemporalBarChart } from "./temporal-bar-chart";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

function EmptyField() {
  return (
    <div className="py-4">
      <p className="font-editorial text-[17px] text-muted">
        {i18n.public.questionnaireAnalysis.emptyChart}
      </p>
    </div>
  );
}

export function AnalysisFieldRenderer({ field }: { field: AnalysisField }) {
  if (field.responseCount === 0) {
    return <EmptyField />;
  }

  return (
    <div className="space-y-4">
      {field.visualization.chart === "pie" && field.kind === "boolean" ? (
        <BooleanPieChart field={field} />
      ) : (field.visualization.chart === "bar" || field.visualization.chart === "table") &&
        field.kind === "choice" ? (
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
      ) : (
        <EmptyField />
      )}
    </div>
  );
}
