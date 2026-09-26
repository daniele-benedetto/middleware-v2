"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { blurChartFocus, getSingleSeriesChartColor } from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type NumberField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "number" }>;

function formatValue(value: number) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value);
}

export function NumericFrequencyArea({ field }: { field: NumberField }) {
  const seriesColor = getSingleSeriesChartColor();
  const data = field.distribution
    .filter((bucket) => bucket.percentage > 0)
    .map((bucket) => ({
      label:
        bucket.minimum === bucket.maximum
          ? formatValue(bucket.minimum)
          : `${formatValue(bucket.minimum)}-${formatValue(bucket.maximum)}`,
      value: (bucket.minimum + bucket.maximum) / 2,
      percentage: bucket.percentage,
    }));
  const minimum = field.minimum ?? data[0]?.value ?? 0;
  const maximum = field.maximum ?? data.at(-1)?.value ?? minimum;
  const span = maximum - minimum;
  const padding = span === 0 ? Math.max(Math.abs(minimum) * 0.1, 1) : span * 0.08;
  const xDomain: [number, number] =
    minimum >= 0 ? [0, Math.max(maximum, 1)] : [minimum - padding, maximum + padding];

  return (
    <div className="grid gap-3">
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
              tickFormatter={formatValue}
              tickLine={false}
              type="number"
            />
            <YAxis axisLine={false} domain={[0, 100]} tickLine={false} type="number" unit="%" />
            <Area
              dataKey="percentage"
              dot={false}
              fill={seriesColor}
              fillOpacity={0.2}
              isAnimationActive
              stroke={seriesColor}
              strokeWidth={2}
              type="natural"
            />
          </AreaChart>
        </ChartShell>
      </div>
      <div aria-hidden="true" className="h-6.915" />
    </div>
  );
}
