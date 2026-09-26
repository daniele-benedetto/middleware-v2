"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  blurChartFocus,
  getGoldenAngleChartColors,
  getSingleSeriesChartColor,
} from "./chart-colors";
import { ChartShell } from "./chart-shell";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type DateField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "date" }>;

function formatBucket(value: string, field: DateField) {
  const timeZone = field.temporalType === "date" ? "UTC" : "Europe/Rome";
  if (field.bucketUnit === "quarter") {
    const date = new Date(`${value}T00:00:00.000Z`);
    return `T${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  }
  const options: Intl.DateTimeFormatOptions =
    field.bucketUnit === "year"
      ? { year: "numeric", timeZone }
      : field.bucketUnit === "month"
        ? { month: "long", year: "numeric", timeZone }
        : { day: "numeric", month: "short", year: "numeric", timeZone };
  return new Intl.DateTimeFormat("it-IT", options).format(new Date(`${value}T00:00:00.000Z`));
}

export function TemporalBarChart({ field }: { field: DateField }) {
  const seriesColor = getSingleSeriesChartColor();
  const data = field.distribution.map((bucket) => ({
    ...bucket,
    date: formatBucket(bucket.date, field),
  }));
  const colors = getGoldenAngleChartColors(field.distribution.map((bucket) => bucket.date));
  const chartData = data.map((item, index) => ({
    ...item,
    fill: colors.get(field.distribution[index].date),
  }));

  return (
    <div className="grid gap-3">
      <ChartShell
        config={{ percentage: { label: "Percentuale", color: seriesColor } }}
        className="h-[clamp(15rem,58vw,21rem)] min-h-60"
      >
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ left: 8, right: 12 }}
          onClick={blurChartFocus}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} tickMargin={8} minTickGap={24} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
          <Bar dataKey="percentage" barSize={18} isAnimationActive radius={2}>
            {chartData.map((item) => (
              <Cell fill={item.fill} key={item.start} />
            ))}
          </Bar>
        </BarChart>
      </ChartShell>
      <ul
        aria-label="Legenda dei periodi"
        className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-foreground/20 pt-3"
      >
        {chartData.map((item) => (
          <li
            className="flex items-center gap-2 font-ui text-[11px] font-bold text-foreground sm:text-xs"
            key={item.start}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.fill }}
            />
            <span>{item.date}</span>
            <span className="tabular-nums">{item.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
