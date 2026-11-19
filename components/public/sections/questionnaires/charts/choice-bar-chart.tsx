"use client";

import { cn } from "@/lib/utils";

import { CHART_SERIES_COLOR } from "./chart-colors";
import { formatChartPercentage } from "./chart-format";
import { ChartTooltipBody } from "./chart-tooltip";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type ChoiceField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "choice" }>;

/** Thinner bars and tighter rows as options grow, so long lists stay scannable. */
function getDensity(optionCount: number) {
  if (optionCount <= 4) return { bar: "h-4", gap: "gap-5" };
  if (optionCount <= 8) return { bar: "h-3", gap: "gap-4" };
  return { bar: "h-2", gap: "gap-3" };
}

/**
 * Horizontal bars for single and multiple choice. Each row carries its own label (wrapping,
 * never truncated) and percentage above a bar on a shared 0–100% track, so options are
 * identified by text and compared by length: one colour, no legend. The chart is plain
 * markup, so its height follows the number of options and the labels stay real text.
 */
export function ChoiceBarChart({ field }: { field: ChoiceField }) {
  const density = getDensity(field.options.length);

  return (
    <ul
      aria-label="Distribuzione percentuale delle risposte"
      className={cn("grid", density.gap)}
      data-chart="choice-bars"
    >
      {field.options.map((option) => (
        <li className="group relative grid gap-1.5" key={option.id}>
          <div className="flex items-baseline justify-between gap-4 font-ui text-xs leading-snug font-bold text-foreground sm:text-[13px]">
            <span className="min-w-0 break-words">{option.label}</span>
            <span className="shrink-0 tabular-nums">
              {formatChartPercentage(option.percentage)}
            </span>
          </div>
          <span className="sr-only">{`${option.count} risposte`}</span>
          <div aria-hidden="true" className={cn("w-full bg-foreground/8", density.bar)}>
            <div
              className="h-full rounded-r-[2px]"
              style={{
                backgroundColor: CHART_SERIES_COLOR,
                width: `${Math.min(100, Math.max(0, option.percentage))}%`,
              }}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 bottom-full z-10 hidden translate-y-1 group-hover:block"
          >
            <ChartTooltipBody
              label={option.label}
              percentage={option.percentage}
              count={option.count}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
