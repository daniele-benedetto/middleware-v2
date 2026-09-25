"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { getSingleSeriesChartColor } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type NumberField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "number" }>;

export function DiscreteDistributionChart({ field }: { field: NumberField }) {
  const seriesColor = getSingleSeriesChartColor();
  const data = field.distribution.map((bucket) => ({
    label:
      bucket.minimum === bucket.maximum
        ? String(bucket.minimum)
        : `${bucket.minimum}-${bucket.maximum}`,
    percentage: bucket.percentage,
  }));
  return (
    <ChartShell config={{ percentage: { label: "Percentuale", color: seriesColor } }}>
      <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={2} />
      </BarChart>
    </ChartShell>
  );
}
