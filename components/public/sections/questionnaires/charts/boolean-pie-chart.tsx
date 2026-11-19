"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ChartTooltip } from "@/components/ui/chart";

import { blurChartFocus, CHART_SECONDARY_COLOR, CHART_SERIES_COLOR } from "./chart-colors";
import { formatChartPercentage } from "./chart-format";
import { ChartShell } from "./chart-shell";
import { AnalysisChartTooltip, type ChartDatum } from "./chart-tooltip";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type BooleanField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "boolean" }>;

type BooleanChartItem = ChartDatum & { count: number; fill: string };

function toPercentage(count: number, total: number) {
  return total === 0 ? 0 : (count / total) * 100;
}

export function BooleanPieChart({ field }: { field: BooleanField }) {
  const total = field.trueCount + field.falseCount;
  const data: BooleanChartItem[] = [
    {
      label: field.trueLabel,
      count: field.trueCount,
      percentage: toPercentage(field.trueCount, total),
      fill: CHART_SERIES_COLOR,
    },
    {
      label: field.falseLabel,
      count: field.falseCount,
      percentage: toPercentage(field.falseCount, total),
      fill: CHART_SECONDARY_COLOR,
    },
  ];

  return (
    <div className="grid gap-3">
      <ChartShell config={{}} className="h-[clamp(15rem,58vw,21rem)] min-h-60">
        <PieChart accessibilityLayer onClick={blurChartFocus}>
          <ChartTooltip content={<AnalysisChartTooltip />} isAnimationActive={false} />
          <Pie
            data={data}
            dataKey="count"
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
            <li className="flex items-baseline gap-2" key={item.label}>
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 translate-y-px rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <div className="flex items-baseline gap-2 font-ui text-[11px] leading-tight font-bold tracking-[0.02em] text-foreground sm:text-xs">
                <p className="max-w-64">{item.label}</p>
                <p className="shrink-0 tabular-nums">{formatChartPercentage(item.percentage)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
