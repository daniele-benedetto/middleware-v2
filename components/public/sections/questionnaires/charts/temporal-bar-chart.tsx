"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type DateField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "date" }>;

export function TemporalBarChart({ field }: { field: DateField }) {
  return (
    <ChartShell config={{ percentage: { label: "Percentuale", color: "var(--chart-2)" } }}>
      <BarChart accessibilityLayer data={field.distribution} margin={{ left: 8, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} tickMargin={8} minTickGap={24} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={2} />
      </BarChart>
    </ChartShell>
  );
}
