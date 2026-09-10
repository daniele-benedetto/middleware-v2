import { publicTypography } from "@/components/public/primitives";
import { cn } from "@/lib/utils";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

function formatNumber(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(`${value.slice(0, 10)}T00:00:00.000Z`),
      )
    : "—";
}

function EmptyChart() {
  return (
    <p className="font-editorial text-[17px] text-muted">Nessun dato aggregato disponibile.</p>
  );
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
    <div className="border-r border-b border-foreground px-4 py-4 last:border-r-0">
      <p className={cn(publicTypography.smallKicker, "text-muted")}>{label}</p>
      <p
        className={cn(
          "mt-2 font-heading text-[clamp(20px,2.5vw,30px)] leading-none font-black tracking-[-0.04em] tabular-nums",
          accent && "text-accent",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PercentageBar({
  label,
  percentage,
  subdued = false,
}: {
  label: string;
  percentage: number;
  subdued?: boolean;
}) {
  const value = Math.min(100, Math.max(0, percentage));
  return (
    <li className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-3 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)_auto]">
      <span className="min-w-0 font-ui text-[11px] leading-[1.3] font-bold tracking-[0.03em] uppercase">
        {label}
      </span>
      <div
        aria-label={`${label}: ${formatPercentage(value)}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="col-span-2 h-2 overflow-hidden bg-foreground/10 sm:col-span-1"
        role="progressbar"
      >
        <div
          className={cn("h-full bg-accent", subdued && "bg-foreground/70")}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="col-start-2 row-start-1 text-right font-ui text-[11px] font-bold tabular-nums sm:col-start-3">
        {formatPercentage(value)}
      </span>
    </li>
  );
}

function ChoiceChart({ field }: { field: Extract<AnalysisField, { kind: "choice" }> }) {
  if (field.responseCount === 0) return <EmptyChart />;

  return (
    <div>
      <ol className="divide-y divide-foreground/15">
        {field.options.map((option, index) => (
          <PercentageBar
            key={option.label}
            label={option.label}
            percentage={option.percentage}
            subdued={index > 0}
          />
        ))}
      </ol>
    </div>
  );
}

function BooleanChart({ field }: { field: Extract<AnalysisField, { kind: "boolean" }> }) {
  const total = field.trueCount + field.falseCount;
  if (total === 0) return <EmptyChart />;

  return (
    <ol className="divide-y divide-foreground/15">
      <PercentageBar label={field.trueLabel} percentage={(field.trueCount / total) * 100} />
      <PercentageBar
        label={field.falseLabel}
        percentage={(field.falseCount / total) * 100}
        subdued
      />
    </ol>
  );
}

function DistributionChart({ field }: { field: Extract<AnalysisField, { kind: "number" }> }) {
  if (field.distribution.length === 0 || field.responseCount === 0) return <EmptyChart />;

  const total = field.responseCount;

  return (
    <ol className="divide-y divide-foreground/15">
      {field.distribution.map((bucket) => {
        const label =
          field.discrete || bucket.minimum === bucket.maximum
            ? formatNumber(bucket.minimum)
            : `${formatNumber(bucket.minimum)}–${formatNumber(bucket.maximum)}`;
        return (
          <PercentageBar
            key={`${bucket.minimum}-${bucket.maximum}`}
            label={label}
            percentage={(bucket.count / total) * 100}
          />
        );
      })}
    </ol>
  );
}

function DateChart({ field }: { field: Extract<AnalysisField, { kind: "date" }> }) {
  if (field.distribution.length === 0 || field.responseCount === 0) return <EmptyChart />;

  const total = field.responseCount;

  return (
    <div>
      <ol className="divide-y divide-foreground/15">
        {field.distribution.map((bucket) => (
          <PercentageBar
            key={bucket.date}
            label={formatDate(bucket.date)}
            percentage={(bucket.count / total) * 100}
          />
        ))}
      </ol>
      <div className="mt-8 grid grid-cols-2 border-l border-t border-foreground">
        <Metric label="Prima data" value={formatDate(field.minimum)} />
        <Metric label="Ultima data" value={formatDate(field.maximum)} accent />
      </div>
    </div>
  );
}

export function QuestionnaireFieldChart({ field }: { field: AnalysisField }) {
  if (field.kind === "choice") return <ChoiceChart field={field} />;
  if (field.kind === "boolean") return <BooleanChart field={field} />;
  if (field.kind === "number") return <DistributionChart field={field} />;
  return <DateChart field={field} />;
}
