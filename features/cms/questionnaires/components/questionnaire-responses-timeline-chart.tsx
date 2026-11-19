"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  blurChartFocus,
  CHART_HOVER_BAND_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/public/sections/questionnaires/charts/chart-colors";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { i18n } from "@/lib/i18n";

import type { RouterOutputs } from "@/lib/trpc/types";

type Timeline = RouterOutputs["questionnaires"]["getSummary"]["timeline"];
type TimelineDay = Timeline["days"][number];

const text = i18n.cms.lists.questionnaires.responses.summary;

// Day keys are calendar days already resolved in Europe/Rome: format them as plain UTC dates.
const tickFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const tooltipFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const numberFormatter = new Intl.NumberFormat("it-IT");

function toDate(dayKey: string) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TimelineDay }>;
}) {
  const day = payload?.[0]?.payload;
  if (!active || !day) return null;
  return (
    <div className="grid min-w-44 gap-1.5 border border-foreground bg-background px-3 py-2 font-ui text-xs text-foreground">
      <p className="font-bold">{tooltipFormatter.format(toDate(day.date))}</p>
      <dl className="grid gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{text.timelineDayResponses}</dt>
          <dd className="font-bold tabular-nums">{numberFormatter.format(day.count)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{text.timelineCumulative}</dt>
          <dd className="font-bold tabular-nums">{numberFormatter.format(day.cumulative)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Responses received per calendar day: one series, so no legend; the title names it. */
export function QuestionnaireResponsesTimelineChart({ timeline }: { timeline: Timeline }) {
  const total = timeline.days.at(-1)?.cumulative ?? 0;

  return (
    <div role="img" aria-label={text.timelineAriaLabel(total, timeline.days.length)}>
      <ChartContainer config={{}} className="h-56 min-h-56 w-full">
        <BarChart
          accessibilityLayer
          barCategoryGap="18%"
          data={timeline.days}
          margin={{ top: 12, left: 0, right: 12 }}
          onClick={blurChartFocus}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            minTickGap={32}
            tickFormatter={(value: string) => tickFormatter.format(toDate(value))}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickFormatter={(value: number) => numberFormatter.format(value)}
            tickLine={false}
            width={40}
          />
          <ChartTooltip
            content={<TimelineTooltip />}
            cursor={{ fill: CHART_HOVER_BAND_COLOR }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="count"
            fill={CHART_SERIES_COLOR}
            isAnimationActive={false}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
