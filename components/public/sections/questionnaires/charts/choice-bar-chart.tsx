"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { getGoldenAngleChartColors } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type ChoiceField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "choice" }>;

export function ChoiceBarChart({ field }: { field: ChoiceField }) {
  const colors = getGoldenAngleChartColors(field.options.map((option) => option.id));
  const config = { percentage: { label: "Percentuale" } };
  return (
    <ChartShell config={config} className="h-[clamp(220px,36vw,420px)] min-h-55">
      <BarChart
        accessibilityLayer
        data={field.options}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          axisLine={false}
          dataKey="label"
          tickLine={false}
          tick={{ fontSize: 11 }}
          type="category"
          width={120}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="percentage" radius={2}>
          {field.options.map((option) => (
            <Cell fill={colors.get(option.id)} key={option.id} />
          ))}
        </Bar>
      </BarChart>
    </ChartShell>
  );
}
