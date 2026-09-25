"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { blurChartFocus, getGoldenAngleChartColors } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type NumberField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "number" }>;

export function DiscreteDistributionChart({ field }: { field: NumberField }) {
  const data = field.distribution.map((bucket) => ({
    label:
      bucket.minimum === bucket.maximum
        ? String(bucket.minimum)
        : `${bucket.minimum}-${bucket.maximum}`,
    percentage: bucket.percentage,
  }));
  const colors = getGoldenAngleChartColors(data.map((item) => item.label));
  const chartData = data.map((item) => ({ ...item, fill: colors.get(item.label) }));

  return (
    <div className="grid gap-3">
      <ChartShell config={{}} className="h-[clamp(15rem,58vw,21rem)] min-h-60">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ left: 8, right: 12 }}
          onClick={blurChartFocus}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} tickMargin={8} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
          <Bar dataKey="percentage" barSize={18} isAnimationActive radius={2}>
            {chartData.map((item) => (
              <Cell fill={item.fill} key={item.label} />
            ))}
          </Bar>
        </BarChart>
      </ChartShell>
      <ul
        aria-label="Legenda dei valori"
        className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-foreground/20 pt-3"
      >
        {chartData.map((item) => (
          <li
            className="flex items-center gap-2 font-ui text-[11px] font-bold text-foreground sm:text-xs"
            key={item.label}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.fill }}
            />
            <span className="max-w-32 truncate">{item.label}</span>
            <span className="tabular-nums">{item.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
