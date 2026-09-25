"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { blurChartFocus, getGoldenAngleChartColors } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type ChoiceField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "choice" }>;

export function ChoiceBarChart({ field }: { field: ChoiceField }) {
  const colors = getGoldenAngleChartColors(field.options.map((option) => option.id));
  const config = { percentage: { label: "Percentuale" } };
  return (
    <div className="grid gap-3">
      <ChartShell config={config} className="h-[clamp(15rem,58vw,21rem)] min-h-60">
        <BarChart
          accessibilityLayer
          data={field.options}
          layout="vertical"
          margin={{ left: 8, right: 16 }}
          onClick={blurChartFocus}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tick={{ fontSize: 11 }}
            type="category"
            width={104}
          />
          <Bar dataKey="percentage" barSize={18} radius={2}>
            {field.options.map((option) => (
              <Cell fill={colors.get(option.id)} key={option.id} />
            ))}
          </Bar>
        </BarChart>
      </ChartShell>
      <ul
        aria-label="Legenda delle risposte"
        className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-foreground/20 pt-3"
      >
        {field.options.map((option) => (
          <li
            className="flex items-center gap-2 font-ui text-[11px] font-bold text-foreground sm:text-xs"
            key={option.id}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors.get(option.id) }}
            />
            <span className="max-w-48 truncate">{option.label}</span>
            <span className="tabular-nums">{option.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
