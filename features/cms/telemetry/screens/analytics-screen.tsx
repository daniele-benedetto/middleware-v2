"use client";

import { useSearchParams } from "next/navigation";

import { CmsEmptyState, CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsDataTableShell,
  CmsPageHeader,
  CmsSelect,
  CmsSurface,
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
import { cmsQueryPolicy } from "@/features/cms/shared/hooks";
import { useCmsListUrlState } from "@/features/cms/shared/hooks";
import { parseTelemetryAnalyticsSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { TelemetryAnalyticsInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type TelemetryAnalyticsInput = RouterInputs["telemetry"]["analyticsSummary"];
type TelemetryTopItem = RouterOutputs["telemetry"]["analyticsSummary"]["topPages"][number];

type CmsAnalyticsScreenProps = {
  initialInput?: TelemetryAnalyticsInput;
  initialData?: TelemetryAnalyticsInitialData;
};

function isSameInput(left: TelemetryAnalyticsInput | undefined, right: TelemetryAnalyticsInput) {
  return Boolean(left && JSON.stringify(left) === JSON.stringify(right));
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("it-IT");
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <CmsSurface className="space-y-2" spacing="md">
      <div className={cmsMetaLabelClass}>{label}</div>
      <div className="font-display text-4xl leading-none text-foreground">
        {formatInteger(value)}
      </div>
    </CmsSurface>
  );
}

function TopItemsTable({ title, items }: { title: string; items: TelemetryTopItem[] }) {
  const text = i18n.cms.lists.analytics;

  return (
    <CmsSurface className="space-y-4" spacing="md">
      <div className={cmsMetaLabelClass}>{title}</div>
      {items.length > 0 ? (
        <Table
          className={cmsTableClasses.table}
          containerClassName={cmsTableClasses.tableContainer}
        >
          <TableHeader>
            <TableRow className={cmsTableClasses.headerRow}>
              <TableHead className={cmsTableClasses.headerCell}>{text.table.label}</TableHead>
              <TableHead className={cmsTableClasses.headerCell}>{text.table.value}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${title}-${item.label}`} className={cmsTableClasses.bodyRow}>
                <TableCell className={cmsTableClasses.bodyCellMeta}>{item.label}</TableCell>
                <TableCell className={cmsTableClasses.bodyCellMeta}>
                  {formatInteger(item.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="py-2 text-sm text-muted-foreground">-</div>
      )}
    </CmsSurface>
  );
}

export function CmsAnalyticsScreen({ initialInput, initialData }: CmsAnalyticsScreenProps) {
  const searchParams = useSearchParams();
  const parsedInput = parseTelemetryAnalyticsSearchParams(searchParams);
  const input: TelemetryAnalyticsInput = { days: parsedInput?.days ?? 30 };
  const text = i18n.cms;
  const listText = text.lists.analytics;

  const query = trpc.telemetry.analyticsSummary.useQuery(input, {
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

  const data = query.data;
  const hasData = data.totals.views > 0 || data.viewsByDay.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.analytics} />
      <div className="space-y-4">
        <p className="font-editorial text-sm text-muted-foreground">{listText.subtitle}</p>
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

        {!hasData ? (
          <CmsSurface>
            <CmsEmptyState
              title={text.resource.emptyTitle(text.navigation.analytics)}
              description={listText.emptyDescription}
              hasActiveFilters={input.days !== 30}
              descriptionFiltered={text.resource.emptyDescriptionFiltered}
            />
          </CmsSurface>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard label={listText.totalViews} value={data.totals.views} />
              <MetricCard label={listText.totalVisitors} value={data.totals.visitors} />
            </div>

            <CmsDataTableShell
              toolbar={<div className={cmsMetaLabelClass}>{listText.viewsByDay}</div>}
              table={
                <Table
                  className={cmsTableClasses.table}
                  containerClassName={cmsTableClasses.tableContainer}
                >
                  <TableHeader>
                    <TableRow className={cmsTableClasses.headerRow}>
                      <TableHead className={cmsTableClasses.headerCell}>
                        {listText.table.date}
                      </TableHead>
                      <TableHead className={cmsTableClasses.headerCell}>
                        {listText.table.views}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.viewsByDay.map((point) => (
                      <TableRow key={point.date} className={cmsTableClasses.bodyRow}>
                        <TableCell className={cmsTableClasses.bodyCellMeta}>
                          {formatDate(point.date)}
                        </TableCell>
                        <TableCell className={cmsTableClasses.bodyCellMeta}>
                          {formatInteger(point.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
              pagination={null}
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <TopItemsTable title={listText.topPages} items={data.topPages} />
              <TopItemsTable title={listText.topReferrers} items={data.topReferrers} />
              <TopItemsTable title={listText.topCountries} items={data.topCountries} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
