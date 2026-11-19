"use client";

import { PercentageColumnChart } from "./percentage-column-chart";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type DateField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "date" }>;

export function HourlyBarChart({ field }: { field: DateField }) {
  const data = (field.hourDistribution ?? []).map((item) => ({
    label: `${String(item.hour).padStart(2, "0")}:00`,
    percentage: item.percentage,
    count: item.count,
  }));

  return <PercentageColumnChart ariaLabel="Distribuzione per ora del giorno" data={data} />;
}
