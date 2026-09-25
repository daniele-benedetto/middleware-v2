import { i18n } from "@/lib/i18n";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

function formatNumber(value: number | null) {
  return value === null
    ? "-"
    : new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value);
}

export function ChartTable({ field }: { field: AnalysisField }) {
  return (
    <details className="mt-4 border-t border-foreground pt-3">
      <summary className="cursor-pointer font-ui text-[11px] font-bold tracking-[0.08em] uppercase">
        {i18n.public.questionnaireAnalysis.tableViewLabel}
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left font-ui text-xs">
          <thead>
            <tr className="border-b border-foreground">
              {field.kind === "choice" ? (
                <>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.value}</th>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.count}</th>
                  <th className="px-2 py-2 font-bold">
                    {i18n.public.questionnaireAnalysis.percentage}
                  </th>
                </>
              ) : field.kind === "number" ? (
                <>
                  <th className="px-2 py-2 font-bold">
                    {i18n.public.questionnaireAnalysis.interval}
                  </th>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.count}</th>
                  <th className="px-2 py-2 font-bold">
                    {i18n.public.questionnaireAnalysis.percentage}
                  </th>
                </>
              ) : field.kind === "date" ? (
                <>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.start}</th>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.end}</th>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.count}</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.value}</th>
                  <th className="px-2 py-2 font-bold">{i18n.public.questionnaireAnalysis.count}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {field.kind === "choice"
              ? field.options.map((option) => (
                  <tr className="border-b border-foreground/15" key={option.id}>
                    <td className="px-2 py-2">{option.label}</td>
                    <td className="px-2 py-2 tabular-nums">{option.count}</td>
                    <td className="px-2 py-2 tabular-nums">{formatNumber(option.percentage)}%</td>
                  </tr>
                ))
              : field.kind === "number"
                ? field.distribution.map((bucket) => (
                    <tr
                      className="border-b border-foreground/15"
                      key={`${bucket.minimum}-${bucket.maximum}`}
                    >
                      <td className="px-2 py-2">
                        {bucket.minimum === bucket.maximum
                          ? formatNumber(bucket.minimum)
                          : `${formatNumber(bucket.minimum)} - ${formatNumber(bucket.maximum)}`}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{bucket.count}</td>
                      <td className="px-2 py-2 tabular-nums">{formatNumber(bucket.percentage)}%</td>
                    </tr>
                  ))
                : field.kind === "date"
                  ? field.distribution.map((bucket) => (
                      <tr className="border-b border-foreground/15" key={bucket.date}>
                        <td className="px-2 py-2">{bucket.start}</td>
                        <td className="px-2 py-2">{bucket.end}</td>
                        <td className="px-2 py-2 tabular-nums">{bucket.count}</td>
                      </tr>
                    ))
                  : [
                      [field.trueLabel, field.trueCount],
                      [field.falseLabel, field.falseCount],
                    ].map(([label, count]) => (
                      <tr className="border-b border-foreground/15" key={String(label)}>
                        <td className="px-2 py-2">{label}</td>
                        <td className="px-2 py-2 tabular-nums">{count}</td>
                      </tr>
                    ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
