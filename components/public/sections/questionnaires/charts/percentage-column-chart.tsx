"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "@/components/ui/chart";

import { blurChartFocus, CHART_HOVER_BAND_COLOR, CHART_SERIES_COLOR } from "./chart-colors";
import { formatChartPercentage, getPercentageAxisMaximum } from "./chart-format";
import { ChartShell } from "./chart-shell";
import { AnalysisChartTooltip, type ChartDatum } from "./chart-tooltip";

/**
 * Single-series column chart of percentages along an ordered axis (scale values, numeric
 * bins, hours, periods). One colour, no legend: the axis already names every column.
 * `contiguous` removes the gaps between columns for binned (histogram) data.
 */
export function PercentageColumnChart({
  data,
  ariaLabel,
  contiguous = false,
  minTickGap = 8,
}: {
  data: ChartDatum[];
  ariaLabel: string;
  contiguous?: boolean;
  minTickGap?: number;
}) {
  const axisMaximum = getPercentageAxisMaximum(data.map((item) => item.percentage));

  return (
    <div aria-label={ariaLabel} role="img">
      <ChartShell config={{}} className="h-[clamp(15rem,58vw,21rem)] min-h-60">
        <BarChart
          accessibilityLayer
          barCategoryGap={contiguous ? 1 : "22%"}
          data={data}
          margin={{ top: 12, left: 8, right: 12 }}
          onClick={blurChartFocus}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={minTickGap}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            domain={[0, axisMaximum]}
            tickFormatter={formatChartPercentage}
            tickLine={false}
            width={44}
          />
          <ChartTooltip
            content={<AnalysisChartTooltip />}
            cursor={{ fill: CHART_HOVER_BAND_COLOR }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="percentage"
            fill={CHART_SERIES_COLOR}
            maxBarSize={contiguous ? undefined : 40}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ChartShell>
    </div>
  );
}
