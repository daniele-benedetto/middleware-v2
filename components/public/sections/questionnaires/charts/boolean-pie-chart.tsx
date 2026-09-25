"use client";

import { Cell, Pie, PieChart } from "recharts";

import { blurChartFocus, getGoldenAngleChartColors } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type BooleanField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "boolean" }>;

type BooleanChartItem = {
  label: string;
  value: number;
  fill: string;
};

function formatPercentage(value: number, total: number) {
  if (total === 0) return "0%";
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(
    (value / total) * 100,
  )}%`;
}

export function BooleanPieChart({ field }: { field: BooleanField }) {
  const colors = getGoldenAngleChartColors(["true", "false"]);
  const data: BooleanChartItem[] = [
    { label: field.trueLabel, value: field.trueCount, fill: colors.get("true")! },
    { label: field.falseLabel, value: field.falseCount, fill: colors.get("false")! },
  ];
  const config = {};
  const total = field.trueCount + field.falseCount;

  return (
    <div className="grid gap-3">
      <ChartShell config={config} className="h-[clamp(15rem,58vw,21rem)] min-h-60">
        <PieChart accessibilityLayer onClick={blurChartFocus}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius="84%"
            stroke="var(--background)"
            strokeWidth={2}
          >
            {data.map((item) => (
              <Cell fill={item.fill} key={item.label} />
            ))}
          </Pie>
        </PieChart>
      </ChartShell>
      <div className="border-t border-foreground/20 pt-3">
        <ul
          aria-label="Legenda delle risposte"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          {data.map((item) => (
            <li className="flex items-center gap-2" key={item.label}>
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <div className="flex items-baseline gap-2 font-ui text-[11px] leading-tight font-bold tracking-[0.02em] text-foreground sm:text-xs">
                <p className="max-w-48 truncate">{item.label}</p>
                <p className="shrink-0 tabular-nums">{formatPercentage(item.value, total)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
