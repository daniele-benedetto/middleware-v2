"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "@/components/ui/chart";

import { blurChartFocus, CHART_SERIES_COLOR } from "./chart-colors";
import {
  formatChartNumber,
  formatChartPercentage,
  formatChartRange,
  getPercentageAxisMaximum,
} from "./chart-format";
import { ChartShell } from "./chart-shell";
import { AnalysisChartTooltip } from "./chart-tooltip";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type NumberField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "number" }>;

export function NumericFrequencyArea({ field }: { field: NumberField }) {
  const data = field.distribution
    .filter((bucket) => bucket.percentage > 0)
    .map((bucket) => ({
      label: formatChartRange(bucket.minimum, bucket.maximum),
      value: (bucket.minimum + bucket.maximum) / 2,
      percentage: bucket.percentage,
      count: bucket.count,
    }));
  const minimum = field.minimum ?? data[0]?.value ?? 0;
  const maximum = field.maximum ?? data.at(-1)?.value ?? minimum;
  const span = maximum - minimum;
  const padding = span === 0 ? Math.max(Math.abs(minimum) * 0.1, 1) : span * 0.08;
  const xDomain: [number, number] =
    minimum >= 0 ? [0, Math.max(maximum, 1)] : [minimum - padding, maximum + padding];
  const axisMaximum = getPercentageAxisMaximum(data.map((item) => item.percentage));

  return (
    <div aria-label="Distribuzione dei valori" role="img">
      <ChartShell config={{}} className="h-[clamp(15rem,58vw,21rem)] min-h-60">
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
          onClick={blurChartFocus}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="value"
            domain={xDomain}
            tickFormatter={formatChartNumber}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            domain={[0, axisMaximum]}
            tickFormatter={formatChartPercentage}
            tickLine={false}
            type="number"
            width={44}
          />
          <ChartTooltip
            content={<AnalysisChartTooltip />}
            cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.3 }}
            isAnimationActive={false}
          />
          {/* Straight segments between the observed values: a smoothed curve would draw
              peaks and dips that no response supports. */}
          <Area
            activeDot={{ r: 5, stroke: "var(--background)", strokeWidth: 2 }}
            dataKey="percentage"
            dot={{ r: 3, fill: CHART_SERIES_COLOR, strokeWidth: 0 }}
            fill={CHART_SERIES_COLOR}
            fillOpacity={0.12}
            stroke={CHART_SERIES_COLOR}
            strokeWidth={2}
            type="linear"
          />
        </AreaChart>
      </ChartShell>
    </div>
  );
}
