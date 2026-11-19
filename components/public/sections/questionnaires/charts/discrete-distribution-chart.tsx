"use client";

import { formatChartRange } from "./chart-format";
import { PercentageColumnChart } from "./percentage-column-chart";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type NumberField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "number" }>;

export function DiscreteDistributionChart({ field }: { field: NumberField }) {
  const data = field.distribution.map((bucket) => ({
    label: formatChartRange(bucket.minimum, bucket.maximum),
    percentage: bucket.percentage,
    count: bucket.count,
  }));

  return <PercentageColumnChart ariaLabel="Distribuzione dei valori" data={data} />;
}
