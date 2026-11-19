import { i18n } from "@/lib/i18n";

import { formatChartNumber, formatChartPercentage, formatChartRange } from "./chart-format";

import type { AnalysisField } from "./analysis-views";

type DateField = Extract<AnalysisField, { kind: "date" }>;

type TableRow = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

type TableSection = {
  key: string;
  caption: string;
  rowHeader: string;
  rows: TableRow[];
};

const strings = i18n.public.questionnaireAnalysis;

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

function share(count: number, total: number) {
  return total === 0 ? 0 : (count / total) * 100;
}

function periodRows(field: DateField): TableRow[] {
  return field.distribution.map((bucket) => ({
    key: bucket.start,
    label: formatDateBucket(bucket.date, field),
    count: bucket.count,
    percentage: bucket.percentage,
  }));
}

function hourRows(field: DateField): TableRow[] {
  return (field.hourDistribution ?? []).map((item) => ({
    key: String(item.hour),
    label: `${String(item.hour).padStart(2, "0")}:00`,
    count: item.count,
    percentage: item.percentage,
  }));
}

function buildSections(field: AnalysisField): TableSection[] {
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
          count: option.count,
          percentage: option.percentage,
        })),
      },
    ];
  }

  if (field.kind === "boolean") {
    const total = field.trueCount + field.falseCount;
    return [
      {
        key: "boolean",
        caption,
        rowHeader: strings.answer,
        rows: [
          {
            key: "true",
            label: field.trueLabel,
            count: field.trueCount,
            percentage: share(field.trueCount, total),
          },
          {
            key: "false",
            label: field.falseLabel,
            count: field.falseCount,
            percentage: share(field.falseCount, total),
          },
        ],
      },
    ];
  }

  if (field.kind === "number") {
    return [
      {
        key: "distribution",
        caption,
        rowHeader: field.discrete ? strings.value : strings.interval,
        rows: field.distribution.map((bucket) => ({
          key: `${bucket.minimum}-${bucket.maximum}`,
          label: formatChartRange(bucket.minimum, bucket.maximum),
          count: bucket.count,
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
const bodyCellClass = "border-b border-foreground/20 px-3 py-2.5 first:pl-0 last:pr-0";

function DataTable({ section, responseCount }: { section: TableSection; responseCount: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-ui text-[13px] text-foreground sm:text-sm">
        <caption className="sr-only">{section.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${headerCellClass} text-left`}>
              {section.rowHeader}
            </th>
            <th scope="col" className={`${headerCellClass} text-right`}>
              {strings.count}
            </th>
            <th scope="col" className={`${headerCellClass} text-right`}>
              {strings.percentage}
            </th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className={`${bodyCellClass} text-left font-bold`}>
                {row.label}
              </th>
              <td className={`${bodyCellClass} text-right tabular-nums`}>
                {formatChartNumber(row.count)}
              </td>
              <td className={`${bodyCellClass} text-right tabular-nums`}>
                <span className="flex items-center justify-end gap-3">
                  <span aria-hidden="true" className="hidden h-2 w-24 bg-foreground/10 sm:block">
                    <span
                      className="block h-full bg-accent"
                      style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                    />
                  </span>
                  <span className="min-w-14">{formatChartPercentage(row.percentage)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="px-3 py-2.5 pl-0 text-left font-bold text-muted">
              {strings.validResponses}
            </th>
            <td className="px-3 py-2.5 text-right font-bold tabular-nums">
              {formatChartNumber(responseCount)}
            </td>
            <td className="py-2.5 pl-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function AnalysisTable({ field }: { field: AnalysisField }) {
  return (
    <div className="grid gap-8">
      {buildSections(field).map((section) => (
        <DataTable key={section.key} section={section} responseCount={field.responseCount} />
      ))}
    </div>
  );
}
