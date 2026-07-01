"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Point = Record<string, string | number | null>;

export function ObservabilityAreaChart({
  data,
  series,
}: {
  data: Point[];
  series: Array<{ key: string; label: string; color: string }>;
}) {
  return (
    <ChartContainer
      className="h-64"
      config={Object.fromEntries(
        series.map((item) => [item.key, { label: item.label, color: item.color }]),
      )}
    >
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={(props) => <ChartTooltipContent {...props} />} />
        {series.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={`var(--color-${item.key})`}
            fill={`var(--color-${item.key})`}
            fillOpacity={0.18}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

export function ObservabilityLineChart({
  data,
  dataKey,
  label,
  color = "var(--foreground)",
}: {
  data: Point[];
  dataKey: string;
  label: string;
  color?: string;
}) {
  return (
    <ChartContainer className="h-64" config={{ [dataKey]: { label, color } }}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={(props) => <ChartTooltipContent {...props} />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={label}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function ObservabilityBarChart({
  data,
  dataKey,
  label,
  nameKey = "name",
  color = "var(--foreground)",
}: {
  data: Point[];
  dataKey: string;
  label: string;
  nameKey?: string;
  color?: string;
}) {
  return (
    <ChartContainer className="h-64" config={{ [dataKey]: { label, color } }}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={nameKey} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={(props) => <ChartTooltipContent {...props} />} />
        <Bar
          dataKey={dataKey}
          name={label}
          fill={`var(--color-${dataKey})`}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
