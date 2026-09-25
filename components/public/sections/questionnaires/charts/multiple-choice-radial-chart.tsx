"use client";

import { PolarAngleAxis, PolarGrid, RadialBar, RadialBarChart } from "recharts";

import { blurChartFocus, getGoldenAngleChartColors } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type ChoiceField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "choice" }>;

export function MultipleChoiceRadialChart({ field }: { field: ChoiceField }) {
  const colors = getGoldenAngleChartColors(field.options.map((option) => option.id));
  const data = field.options.map((option) => ({
    option: option.label,
    percentage: option.percentage,
    fill: colors.get(option.id),
  }));

  return (
    <div className="grid gap-3">
      <div aria-label="Distribuzione percentuale delle risposte" role="img">
        <ChartShell config={{ percentage: { label: "Percentuale" } }} className="h-80 min-h-80">
          <RadialBarChart
            accessibilityLayer
            data={data}
            innerRadius="18%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            onClick={blurChartFocus}
          >
            <PolarGrid gridType="circle" stroke="var(--foreground)" strokeOpacity={0.14} />
            <PolarAngleAxis domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              background={{ fill: "var(--foreground)", opacity: 0.07 }}
              barSize={18}
              cornerRadius={3}
              dataKey="percentage"
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ChartShell>
      </div>
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
