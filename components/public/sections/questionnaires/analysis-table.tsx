import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import {
  formatAnalysisNumber,
  formatAnalysisPercentage,
  formatAnalysisRange,
} from "./analysis-number-format";

import type { AnalysisTableField } from "./analysis-field";

type DateField = Extract<AnalysisTableField, { kind: "date" }>;

type TableRow = {
  key: string;
  label: string;
  count?: number;
  percentage: number;
};

type TableSection = {
  key: string;
  caption: string;
  rowHeader: string;
  rows: TableRow[];
};

const strings = i18n.public.questionnaireAnalysis;

function readCount(value: object): number | undefined {
  return "count" in value && typeof value.count === "number" ? value.count : undefined;
}

function readResponseCount(field: AnalysisTableField): number | undefined {
  return "responseCount" in field ? field.responseCount : undefined;
}

function formatDateBucket(value: string, field: DateField) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (field.bucketUnit === "quarter") {
    return `T${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  }
  const timeZone = field.temporalType === "date" ? "UTC" : "Europe/Rome";
  const options: Intl.DateTimeFormatOptions =
    field.bucketUnit === "year"
      ? { year: "numeric", timeZone }
      : field.bucketUnit === "month"
        ? { month: "long", year: "numeric", timeZone }
        : { day: "numeric", month: "short", year: "numeric", timeZone };
  return new Intl.DateTimeFormat("it-IT", options).format(date);
}

function periodRows(field: DateField): TableRow[] {
  return field.distribution.map((bucket) => ({
    key: bucket.start,
    label: formatDateBucket(bucket.date, field),
    count: readCount(bucket),
    percentage: bucket.percentage,
  }));
}

function hourRows(field: DateField): TableRow[] {
  return (field.hourDistribution ?? []).map((item) => ({
    key: String(item.hour),
    label: `${String(item.hour).padStart(2, "0")}:00`,
    count: readCount(item),
    percentage: item.percentage,
  }));
}

function booleanRows(field: Extract<AnalysisTableField, { kind: "boolean" }>): TableRow[] {
  const counts = "trueCount" in field ? { true: field.trueCount, false: field.falseCount } : null;
  return [
    {
      key: "true",
      label: field.trueLabel,
      count: counts?.true,
      percentage: field.truePercentage,
    },
    {
      key: "false",
      label: field.falseLabel,
      count: counts?.false,
      percentage: field.falsePercentage,
    },
  ];
}

function buildSections(field: AnalysisTableField): TableSection[] {
  const caption = strings.tableCaption(field.label);

  if (field.kind === "choice") {
    return [
      {
        key: "options",
        caption,
        rowHeader: strings.answer,
        rows: field.options.map((option) => ({
          key: option.id,
          label: option.label,
          count: readCount(option),
          percentage: option.percentage,
        })),
      },
    ];
  }

  if (field.kind === "boolean") {
    return [{ key: "boolean", caption, rowHeader: strings.answer, rows: booleanRows(field) }];
  }

  if (field.kind === "number") {
    return [
      {
        key: "distribution",
        caption,
        rowHeader: field.discrete ? strings.value : strings.interval,
        rows: field.distribution.map((bucket) => ({
          key: `${bucket.minimum}-${bucket.maximum}`,
          label: formatAnalysisRange(bucket.minimum, bucket.maximum),
          count: readCount(bucket),
          percentage: bucket.percentage,
        })),
      },
    ];
  }

  const periods: TableSection = {
    key: "periods",
    caption,
    rowHeader: strings.period,
    rows: periodRows(field),
  };
  const hours: TableSection = {
    key: "hours",
    caption: strings.hourTableCaption(field.label),
    rowHeader: strings.hour,
    rows: hourRows(field),
  };

  if (field.timeDetail === "hourOfDay") return [hours];
  if (field.timeDetail === "dayHour" && hours.rows.length > 0) return [periods, hours];
  return [periods];
}

const headerCellClass =
  "border-b border-foreground px-3 py-2 font-ui text-[11px] font-bold tracking-[0.03em] uppercase first:pl-0 last:pr-0";
const bodyCellClass =
  "border-b border-foreground/20 px-3 py-2.5 first:pl-0 last:pr-0 group-last:border-b-0";

function PercentageCell({ percentage }: { percentage: number }) {
  return (
    <span className="flex items-center justify-end gap-3">
      <span aria-hidden="true" className="hidden h-2 w-24 bg-foreground/10 sm:block">
        <span
          className="block h-full bg-accent"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </span>
      <span className="min-w-14">{formatAnalysisPercentage(percentage)}</span>
    </span>
  );
}

function DataTable({ section, responseCount }: { section: TableSection; responseCount?: number }) {
  const showCounts = responseCount !== undefined;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-ui text-[13px] text-foreground sm:text-sm">
        <caption className="sr-only">{section.caption}</caption>
        <thead className={showCounts ? undefined : "sr-only"}>
          <tr>
            <th scope="col" className={cn(headerCellClass, "text-left")}>
              {section.rowHeader}
            </th>
            {showCounts ? (
              <th scope="col" className={cn(headerCellClass, "text-right")}>
                {strings.count}
              </th>
            ) : null}
            <th scope="col" className={cn(headerCellClass, "text-right")}>
              {strings.percentage}
            </th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.key} className="group">
              <th scope="row" className={`${bodyCellClass} text-left font-bold`}>
                {row.label}
              </th>
              {showCounts ? (
                <td className={`${bodyCellClass} text-right tabular-nums`}>
                  {formatAnalysisNumber(row.count ?? 0)}
                </td>
              ) : null}
              <td className={`${bodyCellClass} text-right tabular-nums`}>
                <PercentageCell percentage={row.percentage} />
              </td>
            </tr>
          ))}
        </tbody>
        {showCounts ? (
          <tfoot>
            <tr>
              <th scope="row" className="px-3 py-2.5 pl-0 text-left font-bold text-muted">
                {strings.validResponses}
              </th>
              <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                {formatAnalysisNumber(responseCount)}
              </td>
              <td className="py-2.5 pl-3" />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function EmptyAnalysis() {
  return (
    <div className="py-4">
      <p className="font-editorial text-[17px] text-muted">{strings.emptyResults}</p>
    </div>
  );
}

export function AnalysisTable({
  field,
  scrollRows = false,
}: {
  field: AnalysisTableField;
  scrollRows?: boolean;
}) {
  if (!field.hasResponses) return <EmptyAnalysis />;

  return (
    <div
      className={cn(
        "grid gap-8",
        scrollRows && "min-h-0 flex-1 content-start overflow-auto overscroll-contain",
      )}
    >
      {buildSections(field).map((section) => (
        <DataTable key={section.key} section={section} responseCount={readResponseCount(field)} />
      ))}
    </div>
  );
}
