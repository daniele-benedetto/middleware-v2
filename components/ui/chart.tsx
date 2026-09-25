"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a ChartContainer");
  return context;
}

function ChartContainer({
  id,
  className,
  config,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const generatedId = React.useId().replace(/:/g, "");
  const chartId = `chart-${id ?? generatedId}`;

  return (
    <ChartContext.Provider value={config}>
      <div
        data-chart={chartId}
        className={cn(
          "flex min-h-56 w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, value]) => value.color || value.theme);
  if (entries.length === 0) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, selector]) =>
              `${selector} [data-chart="${id}"] {${entries
                .map(([key, value]) => {
                  const color = value.theme?.[theme as keyof typeof value.theme] ?? value.color;
                  return color ? `--color-${key}:${color};` : "";
                })
                .join("")}}`,
          )
          .join("\n"),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

type ChartTooltipItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: React.ReactNode;
  className?: string;
}) {
  const config = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-32 gap-1.5 border border-border bg-background px-3 py-2 text-xs shadow-xl",
        className,
      )}
    >
      {label ? <p className="font-bold text-foreground">{label}</p> : null}
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.name ?? "value");
        const labelValue = config[key]?.label ?? item.name ?? key;
        return (
          <div className="flex items-center justify-between gap-4" key={`${key}-${index}`}>
            <span className="text-muted-foreground">{labelValue}</span>
            <span className="font-ui font-bold tabular-nums text-foreground">
              {String(item.value ?? "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegendContent({
  payload,
  className,
}: React.ComponentProps<"div"> & RechartsPrimitive.DefaultLegendContentProps) {
  const config = useChart();
  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3 font-ui text-xs",
        className,
      )}
    >
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? "value");
        return (
          <span className="inline-flex items-center gap-1.5" key={`${key}-${index}`}>
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {config[key]?.label ?? item.value ?? key}
          </span>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
