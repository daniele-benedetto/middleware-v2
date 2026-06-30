"use client";

import { useSearchParams } from "next/navigation";

import { CmsEmptyState, CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsDataTableShell,
  CmsPageHeader,
  CmsSelect,
  cmsTableClasses,
} from "@/components/cms/primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cmsQueryPolicy, useCmsListUrlState } from "@/features/cms/shared/hooks";
import { parseTelemetryPerformanceSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { TelemetryPerformanceInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type TelemetryPerformanceInput = RouterInputs["telemetry"]["performanceSummary"];

type CmsPerformanceScreenProps = {
  initialInput?: TelemetryPerformanceInput;
  initialData?: TelemetryPerformanceInitialData;
};

function isSameInput(
  left: TelemetryPerformanceInput | undefined,
  right: TelemetryPerformanceInput,
) {
  return Boolean(left && JSON.stringify(left) === JSON.stringify(right));
}

function formatNumber(value: number | null) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value);
}

function PeriodSelect({
  days,
  onDaysChange,
}: {
  days: number;
  onDaysChange: (days: number) => void;
}) {
  const optionsText = i18n.cms.listOptions;

  return (
    <CmsSelect
      value={String(days)}
      onValueChange={(value) => {
        onDaysChange(Number(value));
      }}
      options={[
        { value: "7", label: optionsText.period7 },
        { value: "30", label: optionsText.period30 },
        { value: "90", label: optionsText.period90 },
      ]}
    />
  );
}

export function CmsPerformanceScreen({ initialInput, initialData }: CmsPerformanceScreenProps) {
  const searchParams = useSearchParams();
  const parsedInput = parseTelemetryPerformanceSearchParams(searchParams);
  const input: TelemetryPerformanceInput = { days: parsedInput?.days ?? 30 };
  const text = i18n.cms;
  const listText = text.lists.performance;

  const query = trpc.telemetry.performanceSummary.useQuery(input, {
    initialData: isSameInput(initialInput, input) ? initialData : undefined,
    staleTime: cmsQueryPolicy.list.staleTimeMs,
    gcTime: cmsQueryPolicy.list.gcTimeMs,
    retry: cmsQueryPolicy.list.retryCount,
  });

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: { days: input.days },
  });

  if (query.isPending) {
    return <CmsLoadingState />;
  }

  if (query.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(query.error);
    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={uiError.retryable ? () => void query.refetch() : undefined}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.performance} />
      <p className="mb-4 font-editorial text-sm text-muted-foreground">{listText.subtitle}</p>

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>
              {text.common.totalRecords(query.data.metrics.length)}
            </div>
            <div className="flex justify-end">
              <div className="w-full md:w-52">
                <PeriodSelect
                  days={input.days ?? 30}
                  onDaysChange={(days) => {
                    updateSearchParams({ days });
                  }}
                />
              </div>
            </div>
          </div>
        }
        table={
          query.data.metrics.length > 0 ? (
            <Table
              className={cmsTableClasses.table}
              containerClassName={cmsTableClasses.tableContainer}
            >
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.metric}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.path}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.count}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>{listText.table.p50}</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>{listText.table.p75}</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>{listText.table.p95}</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.rating}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.metrics.map((metric) => (
                  <TableRow
                    key={`${metric.name}-${metric.path}`}
                    className={cmsTableClasses.bodyRow}
                  >
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{metric.name}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{metric.path}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{metric.count}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatNumber(metric.p50)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatNumber(metric.p75)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatNumber(metric.p95)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {listText.good}: {metric.good} / {listText.needsImprovement}:{" "}
                      {metric.needsImprovement} / {listText.poor}: {metric.poor}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.performance)}
                description={listText.emptyDescription}
                hasActiveFilters={input.days !== 30}
                descriptionFiltered={text.resource.emptyDescriptionFiltered}
              />
            </div>
          )
        }
        pagination={null}
      />
    </div>
  );
}
