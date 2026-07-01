"use client";

import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

import type { ComponentProps, CSSProperties, ReactElement } from "react";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

type ChartContainerProps = ComponentProps<"div"> & {
  config: ChartConfig;
};

export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps) {
  const chartVars = Object.fromEntries(
    Object.entries(config).flatMap(([key, value], index) => {
      const color = value.color ?? defaultChartColors[index % defaultChartColors.length];
      return [[`--color-${key}`, color]];
    }),
  ) as CSSProperties;

  return (
    <div
      data-slot="chart"
      className={cn(
        "flex aspect-video justify-center text-xs text-muted-foreground",
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-grid_line]:stroke-border",
        "[&_.recharts-tooltip-cursor]:fill-muted [&_.recharts-tooltip-cursor]:opacity-40",
        className,
      )}
      style={{ ...chartVars, ...style }}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
}

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    dataKey?: string | number | ((obj: unknown) => unknown);
    name?: string | number;
    value?: unknown;
  }>;
  label?: string | number;
};

export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-32 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label ? (
        <div className="mb-1 font-mono text-[11px] text-muted-foreground">{label}</div>
      ) : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={`${item.dataKey}`} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-mono text-foreground">{formatTooltipValue(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;
export const ChartLegend = RechartsPrimitive.Legend;

function formatTooltipValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("it-IT") : String(value ?? "-");
}

const defaultChartColors = [
  "var(--foreground)",
  "var(--accent)",
  "var(--muted-foreground)",
  "var(--destructive)",
  "var(--primary)",
];
