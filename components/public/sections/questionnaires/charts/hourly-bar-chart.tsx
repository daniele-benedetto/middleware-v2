"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type DateField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "date" }>;

export function HourlyBarChart({ field }: { field: DateField }) {
  const data = (field.hourDistribution ?? []).map((item) => ({
    label: `${String(item.hour).padStart(2, "0")}:00`,
    percentage: item.percentage,
    count: item.count,
  }));

  return (
    <ChartShell
      config={{ percentage: { label: "Percentuale", color: "var(--chart-2)" } }}
      className="h-75 min-h-75"
    >
      <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tickLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartShell>
  );
}
