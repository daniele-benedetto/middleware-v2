"use client";

import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltipContent } from "@/components/ui/chart";

import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type NumberField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "number" }>;

export function DotPlot({ field }: { field: NumberField }) {
  const data = field.distribution.map((bucket) => ({
    value: (bucket.minimum + bucket.maximum) / 2,
    count: bucket.count,
  }));
  return (
    <ChartShell config={{ count: { label: "Conteggio", color: "var(--chart-2)" } }}>
      <ScatterChart accessibilityLayer margin={{ left: 8, right: 12 }}>
        <CartesianGrid />
        <XAxis dataKey="value" type="number" tickLine={false} />
        <YAxis dataKey="count" type="number" allowDecimals={false} tickLine={false} />
        <Tooltip content={<ChartTooltipContent />} />
        <Scatter data={data} fill="var(--color-count)" />
      </ScatterChart>
    </ChartShell>
  );
}
