"use client";

import { i18n } from "@/lib/i18n";

import { formatChartPercentage } from "./chart-format";

export type ChartDatum = {
  label: string;
  percentage: number;
  count?: number;
};

const RESPONSES_LABEL = "Risposte";

/** The one tooltip body shared by every questionnaire chart: label, percentage, count. */
export function ChartTooltipBody({ label, percentage, count }: ChartDatum) {
  return (
    <div className="grid min-w-36 gap-1.5 border border-foreground bg-background px-3 py-2 font-ui text-xs text-foreground shadow-xl">
      <p className="max-w-56 leading-snug font-bold">{label}</p>
      <dl className="grid gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{i18n.public.questionnaireAnalysis.percentage}</dt>
          <dd className="font-bold tabular-nums">{formatChartPercentage(percentage)}</dd>
        </div>
        {count === undefined ? null : (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{RESPONSES_LABEL}</dt>
            <dd className="font-bold tabular-nums">{count}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Recharts `content` renderer: reads the hovered datum from the tooltip payload. */
export function AnalysisChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
}) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return <ChartTooltipBody label={datum.label} percentage={datum.percentage} count={datum.count} />;
}
