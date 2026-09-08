"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

const accentChartConfig = {
  count: { label: "Risposte", color: "var(--chart-2)" },
} as const;

const booleanChartConfig = {
  positive: { label: "Risposta affermativa", color: "var(--chart-1)" },
  negative: { label: "Risposta negativa", color: "var(--surface-card)" },
} as const;

const axisTick = {
  fill: "var(--muted-text)",
  fontFamily: "var(--font-archivo)",
  fontSize: 10,
  fontWeight: 700,
};

const chartFrameClassName = "h-72 w-full aspect-auto";

function formatNumber(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(`${value.slice(0, 10)}T00:00:00.000Z`),
      )
    : "—";
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-r border-b border-foreground p-3">
      <p className="font-ui text-[9px] font-bold tracking-[0.08em] text-muted uppercase">{label}</p>
      <p
        className={cn(
          "mt-2 font-heading text-[clamp(18px,2vw,26px)] leading-none font-black tracking-[-0.03em]",
          accent && "text-accent",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChoiceChart({ field }: { field: Extract<AnalysisField, { kind: "choice" }> }) {
  const data = [...field.options]
    .sort((left, right) => right.count - left.count)
    .map((option) => ({
      ...option,
      detail: `${formatNumber(option.percentage)}% · ${option.count}`,
    }));

  return (
    <ChartContainer config={accentChartConfig} className={chartFrameClassName}>
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 2, right: 64, bottom: 2 }}
      >
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis
          dataKey="label"
          type="category"
          width={132}
          axisLine={false}
          tickLine={false}
          tick={axisTick}
        />
        <ChartTooltip
          cursor={{ fill: "var(--surface-hover)" }}
          content={
            <ChartTooltipContent className="rounded-none border-foreground bg-background font-ui shadow-none" />
          }
        />
        <Bar
          dataKey="percentage"
          fill="var(--color-count)"
          isAnimationActive={false}
          maxBarSize={22}
        >
          <LabelList
            dataKey="detail"
            position="right"
            className="fill-foreground font-ui text-[10px] font-bold"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function BooleanChart({ field }: { field: Extract<AnalysisField, { kind: "boolean" }> }) {
  const total = field.trueCount + field.falseCount;
  const data = [{ positive: field.trueCount, negative: field.falseCount }];

  return (
    <div className="space-y-4">
      <ChartContainer config={booleanChartConfig} className={chartFrameClassName}>
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide domain={[0, total || 1]} />
          <YAxis type="category" hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent className="rounded-none border-foreground bg-background font-ui shadow-none" />
            }
          />
          <Bar
            dataKey="positive"
            stackId="answers"
            fill="var(--color-positive)"
            isAnimationActive={false}
            barSize={40}
          />
          <Bar
            dataKey="negative"
            stackId="answers"
            fill="var(--color-negative)"
            isAnimationActive={false}
            stroke="var(--ink)"
            barSize={40}
          />
        </BarChart>
      </ChartContainer>
      <div className="grid grid-cols-2 gap-4 font-ui text-[10px] font-bold tracking-[0.06em] uppercase">
        <span>
          {field.trueLabel}: <strong className="text-accent">{field.trueCount}</strong>
        </span>
        <span className="text-right">
          {field.falseLabel}: {field.falseCount}
        </span>
      </div>
    </div>
  );
}

function NumericChart({ field }: { field: Extract<AnalysisField, { kind: "number" }> }) {
  if (field.distribution.length === 0) {
    return <p className="font-editorial text-[16px] text-muted">Nessuna risposta disponibile.</p>;
  }

  const data = field.distribution.map((bucket) => ({
    ...bucket,
    label:
      field.discrete || bucket.minimum === bucket.maximum
        ? formatNumber(bucket.minimum)
        : `${formatNumber(bucket.minimum)}–${formatNumber(bucket.maximum)}`,
  }));

  return (
    <div>
      <ChartContainer config={accentChartConfig} className={chartFrameClassName}>
        <BarChart accessibilityLayer data={data} margin={{ top: 18, right: 4, bottom: 2, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line-section)" />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: "var(--ink)" }}
            tickLine={false}
            tickMargin={10}
            tick={axisTick}
            interval={0}
          />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fill: "var(--surface-hover)" }}
            content={
              <ChartTooltipContent className="rounded-none border-foreground bg-background font-ui shadow-none" />
            }
          />
          <Bar dataKey="count" fill="var(--color-count)" isAnimationActive={false} maxBarSize={52}>
            <LabelList
              dataKey="count"
              position="top"
              className="fill-foreground font-ui text-[10px] font-bold"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="mt-7 grid grid-cols-3 border-l border-t border-foreground">
        <Metric label="Min." value={formatNumber(field.minimum)} />
        <Metric label="Media" value={formatNumber(field.average)} accent />
        <Metric label="Max." value={formatNumber(field.maximum)} />
      </div>
    </div>
  );
}

function DateChart({ field }: { field: Extract<AnalysisField, { kind: "date" }> }) {
  if (field.distribution.length === 0) {
    return <p className="font-editorial text-[16px] text-muted">Nessuna risposta disponibile.</p>;
  }

  const data = field.distribution.map((bucket) => ({ ...bucket, label: formatDate(bucket.date) }));

  return (
    <div>
      <ChartContainer config={accentChartConfig} className={chartFrameClassName}>
        <BarChart accessibilityLayer data={data} margin={{ top: 18, right: 4, bottom: 2, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line-section)" />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: "var(--ink)" }}
            tickLine={false}
            tickMargin={10}
            tick={axisTick}
            minTickGap={28}
          />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fill: "var(--surface-hover)" }}
            content={
              <ChartTooltipContent className="rounded-none border-foreground bg-background font-ui shadow-none" />
            }
          />
          <Bar dataKey="count" fill="var(--color-count)" isAnimationActive={false} maxBarSize={52}>
            <LabelList
              dataKey="count"
              position="top"
              className="fill-foreground font-ui text-[10px] font-bold"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="mt-7 grid grid-cols-2 border-l border-t border-foreground">
        <Metric label="Prima data" value={formatDate(field.minimum)} />
        <Metric label="Ultima data" value={formatDate(field.maximum)} accent />
      </div>
    </div>
  );
}

export function QuestionnaireFieldChart({ field }: { field: AnalysisField }) {
  if (field.kind === "choice") return <ChoiceChart field={field} />;
  if (field.kind === "boolean") return <BooleanChart field={field} />;
  if (field.kind === "number") return <NumericChart field={field} />;
  return <DateChart field={field} />;
}
