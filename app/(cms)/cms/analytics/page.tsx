import Link from "next/link";
import { forbidden } from "next/navigation";

import { CmsPageHeader } from "@/components/cms/primitives";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { ReactNode } from "react";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.analytics,
  description: i18n.cms.lists.analytics.subtitle,
  path: "/cms/analytics",
});

type CmsAnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const periodOptions = [7, 30, 90] as const;
const pageTypeOptions = ["home", "article", "issue", "static_page", "listen", "media"] as const;
const contentTypeOptions = ["article", "issue", "page", "media"] as const;

export default async function CmsAnalyticsPage({ searchParams }: CmsAnalyticsPageProps) {
  const session = await requireCmsSession("/cms/analytics");

  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) {
    forbidden();
  }

  const caller = await getTrpcCaller();
  const params = await searchParams;
  const days = readPeriod(params.days);
  const pageType = readOption(params.pageType, pageTypeOptions);
  const contentType = readOption(params.contentType, contentTypeOptions);
  const summary = await caller.telemetry.engagementSummary({
    days,
    pageType,
    contentType,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <CmsPageHeader title={i18n.cms.navigation.analytics} />
      <section className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <FilterGroup label="Periodo">
          {periodOptions.map((value) => (
            <FilterLink
              key={value}
              active={days === value}
              params={{ days: String(value), pageType, contentType }}
            >
              {value}g
            </FilterLink>
          ))}
        </FilterGroup>
        <FilterGroup label="Pagina">
          <FilterLink active={!pageType} params={{ days: String(days), contentType }}>
            Tutte
          </FilterLink>
          {pageTypeOptions.map((value) => (
            <FilterLink
              key={value}
              active={pageType === value}
              params={{ days: String(days), pageType: value, contentType }}
            >
              {value}
            </FilterLink>
          ))}
        </FilterGroup>
        <FilterGroup label="Contenuto">
          <FilterLink active={!contentType} params={{ days: String(days), pageType }}>
            Tutti
          </FilterLink>
          {contentTypeOptions.map((value) => (
            <FilterLink
              key={value}
              active={contentType === value}
              params={{ days: String(days), pageType, contentType: value }}
            >
              {value}
            </FilterLink>
          ))}
        </FilterGroup>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Letture qualificate" value={summary.qualifiedVisits.toString()} />
        <MetricCard label="Completamenti" value={summary.completedReads.toString()} />
        <MetricCard label="Completion rate" value={formatPercent(summary.completionRate)} />
        <MetricCard
          label="Tempo attivo medio"
          value={formatDuration(summary.averageActiveTimeMs)}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Qualita engagement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Breakdown degli episodi interpretati. Le page view legacy non sono usate.
          </p>
          <div className="mt-5 space-y-3">
            {summary.engagementBreakdown.map((item) => (
              <div key={item.level} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium capitalize">{item.level}</span>
                <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Affidabilita campione: {summary.sampleConfidence}
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-heading text-lg font-semibold">Contenuti per qualita</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordinati per letture qualificate negli ultimi 30 giorni.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Contenuto</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Qualificate</th>
                  <th className="px-5 py-3 text-right">Complete</th>
                  <th className="px-5 py-3 text-right">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {summary.topContent.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>
                      Gli episodi ContentEngagement compariranno dopo le prime visite pubbliche.
                    </td>
                  </tr>
                ) : (
                  summary.topContent.map((item) => (
                    <tr
                      key={`${item.contentId ?? item.path}-${item.pageType}`}
                      className="border-t border-border"
                    >
                      <td className="px-5 py-4 font-medium">{item.slug ?? item.path}</td>
                      <td className="px-5 py-4 text-muted-foreground">{item.pageType}</td>
                      <td className="px-5 py-4 text-right font-mono">{item.qualifiedVisits}</td>
                      <td className="px-5 py-4 text-right font-mono">{item.completedReads}</td>
                      <td className="px-5 py-4 text-right font-mono">
                        {formatDuration(item.averageActiveTimeMs)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {summary.lowQualityContent.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Aperti ma non letti</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Episodi iniziati senza letture qualificate o completamenti.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {summary.lowQualityContent.map((item) => (
              <div
                key={`${item.contentId ?? item.path}-low`}
                className="flex items-center justify-between border border-border p-3 text-sm"
              >
                <span className="font-medium">{item.slug ?? item.path}</span>
                <span className="font-mono text-xs text-muted-foreground">{item.pageType}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function readPeriod(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return periodOptions.includes(parsed as (typeof periodOptions)[number])
    ? (parsed as (typeof periodOptions)[number])
    : 30;
}

function readOption<T extends readonly string[]>(value: string | string[] | undefined, options: T) {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved && options.includes(resolved) ? (resolved as T[number]) : undefined;
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-heading text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterLink({
  active,
  params,
  children,
}: {
  active: boolean;
  params: Record<string, string | undefined>;
  children: ReactNode;
}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  return (
    <Link
      href={`/cms/analytics${searchParams.size ? `?${searchParams.toString()}` : ""}`}
      className={
        active
          ? "rounded-full bg-foreground px-3 py-1 font-heading text-xs font-bold text-background uppercase"
          : "rounded-full bg-muted px-3 py-1 font-heading text-xs font-bold text-muted-foreground uppercase hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 font-heading text-3xl font-semibold">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(value: number) {
  if (value < 1000) {
    return "0s";
  }

  const seconds = Math.round(value / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}
