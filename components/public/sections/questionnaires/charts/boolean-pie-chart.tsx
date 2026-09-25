"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type BooleanField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "boolean" }>;

export function BooleanPieChart({ field }: { field: BooleanField }) {
  const data = [
    { label: field.trueLabel, value: field.trueCount, fill: "var(--color-yes)" },
    { label: field.falseLabel, value: field.falseCount, fill: "var(--color-no)" },
  ];
  const config = {
    value: { label: "Risposte" },
    yes: { label: field.trueLabel, color: "var(--chart-2)" },
    no: { label: field.falseLabel, color: "var(--chart-5)" },
  };

  return (
    <ChartShell config={config} className="h-65 min-h-65">
      <PieChart accessibilityLayer>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="72%">
          {data.map((item) => (
            <Cell fill={item.fill} key={item.label} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartShell>
  );
}
