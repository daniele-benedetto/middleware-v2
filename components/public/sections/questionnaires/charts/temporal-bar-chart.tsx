"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { getSingleSeriesChartColor } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type DateField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "date" }>;

function formatBucket(value: string, field: DateField) {
  const timeZone = field.temporalType === "date" ? "UTC" : "Europe/Rome";
  const options: Intl.DateTimeFormatOptions =
    field.bucketUnit === "year"
      ? { year: "numeric", timeZone }
      : field.bucketUnit === "month"
        ? { month: "long", year: "numeric", timeZone }
        : { day: "numeric", month: "short", year: "numeric", timeZone };
  return new Intl.DateTimeFormat("it-IT", options).format(new Date(`${value}T00:00:00.000Z`));
}

export function TemporalBarChart({ field }: { field: DateField }) {
  const seriesColor = getSingleSeriesChartColor();
  const data = field.distribution.map((bucket) => ({
    ...bucket,
    date: formatBucket(bucket.date, field),
  }));

  return (
    <ChartShell config={{ percentage: { label: "Percentuale", color: seriesColor } }}>
      <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} tickMargin={8} minTickGap={24} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={2} />
      </BarChart>
    </ChartShell>
  );
}
