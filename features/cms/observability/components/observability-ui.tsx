"use client";

import Link from "next/link";

import { CopyTechnicalValueButton } from "@/components/cms/common/copy-technical-value-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type {
  ObservabilityHealthScoreDto,
  ObservabilityInsightDto,
} from "@/lib/server/modules/observability-overview/dto";
import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string | number;
  description?: string;
  confidence?: string | null;
  tone?: "default" | "good" | "warning" | "critical";
};

export function ObservabilityMetricCard({
  label,
  value,
  description,
  confidence,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className={cn("p-5", tone === "critical" && "border-destructive/60")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        {confidence ? <ObservabilityStatusBadge value={confidence} kind="confidence" /> : null}
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold">{value}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </Card>
  );
}

type StatusBadgeProps = {
  value: string | boolean | null | undefined;
  kind?:
    | "severity"
    | "status"
    | "risk"
    | "outcome"
    | "quality"
    | "engagement"
    | "confidence"
    | "default";
};

export function ObservabilityStatusBadge({ value, kind = "default" }: StatusBadgeProps) {
  if (value === null || value === undefined || value === "") return null;
  const label = typeof value === "boolean" ? (value ? "si" : "no") : humanize(value);

  return (
    <Badge variant="outline" className={cn("capitalize", resolveBadgeClass(String(value), kind))}>
      {label}
    </Badge>
  );
}

type ChartCardProps = {
  title: string;
  description?: string;
  question?: string;
  confidence?: string | null;
  children: ReactNode;
  className?: string;
};

export function ObservabilityChartCard({
  title,
  description,
  question,
  confidence,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {confidence ? <ObservabilityStatusBadge value={confidence} kind="confidence" /> : null}
        </div>
        {question ? <p className="text-xs font-medium text-muted-foreground">{question}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type ObservabilityFilterSheetProps = {
  title: string;
  description: string;
  triggerLabel?: string;
  activeCount?: number;
  activeFiltersCount?: number;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  onOpenChange?: (open: boolean) => void;
};

export function ObservabilityFilterSheet({
  title,
  description,
  triggerLabel = "Filtri",
  activeCount = 0,
  activeFiltersCount,
  className,
  children,
  footer,
  onApply,
  onClear,
  onOpenChange,
}: ObservabilityFilterSheetProps) {
  const resolvedActiveCount = activeFiltersCount ?? activeCount;
  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className={className}>
            {resolvedActiveCount > 0 ? `${triggerLabel} (${resolvedActiveCount})` : triggerLabel}
          </Button>
        }
      />
      <SheetContent side="right" className="w-[92vw] max-w-md">
        <div className="border-b-2 border-foreground px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="mt-2">{description}</SheetDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer || onApply || onClear ? (
          <div className="border-t-2 border-foreground px-5 py-4">
            {footer ?? (
              <div className="flex gap-2">
                {onApply ? (
                  <Button type="button" size="sm" onClick={onApply}>
                    Applica
                  </Button>
                ) : null}
                {onClear ? (
                  <Button type="button" size="sm" variant="outline" onClick={onClear}>
                    Pulisci
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type ObservabilityDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function ObservabilityDetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ObservabilityDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] max-w-3xl">
        <div className="border-b-2 border-foreground px-6 py-4">
          <SheetTitle className="font-display text-[20px] font-black tracking-[-0.02em]">
            {title}
          </SheetTitle>
          {description ? <SheetDescription className="mt-2">{description}</SheetDescription> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="border-t-2 border-foreground px-6 py-4">
          {footer ?? (
            <SheetClose
              render={
                <Button variant="outline" size="sm">
                  Chiudi
                </Button>
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type QualityScoreBreakdownProps = {
  score: number | null | undefined;
  components: unknown;
  confidence?: string | null;
};

export function QualityScoreBreakdown({
  score,
  components,
  confidence,
}: QualityScoreBreakdownProps) {
  const rows = normalizeComponents(components);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Quality score
          </p>
          <p className="mt-2 font-heading text-4xl font-semibold">{score ?? "n/a"}</p>
        </div>
        {confidence ? <ObservabilityStatusBadge value={confidence} kind="confidence" /> : null}
      </div>
      <div className="mt-5 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Breakdown non disponibile: il job aggregati deve salvare componenti e pesi.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
              <span className="text-muted-foreground">{humanize(row.label)}</span>
              <span className="font-mono">{row.value}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function ObservabilityEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ObservabilityTechnicalValues({
  values,
}: {
  values: Array<{ label: string; value?: string | null }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <CopyTechnicalValueButton key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function ObservabilityHealthScore({ score }: { score: ObservabilityHealthScoreDto }) {
  return (
    <Card className="border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Health score
          </p>
          <p className="mt-2 font-heading text-5xl font-semibold">{score.score}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ObservabilityStatusBadge value={score.status} kind="quality" />
          <ObservabilityStatusBadge value={score.confidence} kind="confidence" />
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ScoreMetricGroup title="Penalita" items={score.penalties} />
        <ScoreMetricGroup title="Bonus" items={score.bonuses} />
      </div>
      {score.reasons.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {score.reasons.map((reason) => (
            <ObservabilityStatusBadge key={reason} value={reason} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function ObservabilityInsightCard({ insight }: { insight: ObservabilityInsightDto }) {
  return (
    <Card className={cn("p-5", insight.severity === "critical" && "border-destructive/60")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {humanize(insight.type)}
          </p>
          <h3 className="mt-2 font-heading text-lg font-semibold">{insight.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{insight.description}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl font-semibold">{insight.score}</p>
          <div className="mt-2 flex flex-col items-end gap-2">
            <ObservabilityStatusBadge value={insight.severity} kind="severity" />
            <ObservabilityStatusBadge value={insight.confidence} kind="confidence" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {insight.reasons.slice(0, 5).map((reason) => (
          <ObservabilityStatusBadge key={reason} value={reason} />
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
        {insight.metrics.slice(0, 4).map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 border border-border px-3 py-2"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-mono">
              {String(item.value)}
              {item.unit ? ` ${item.unit}` : ""}
            </span>
          </div>
        ))}
      </div>
      {insight.deepLinks.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {insight.deepLinks.map((deepLink) => (
            <Link
              key={`${deepLink.label}-${deepLink.href}`}
              href={deepLink.href}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              {deepLink.label}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function ScoreMetricGroup({
  title,
  items,
}: {
  title: string;
  items: ObservabilityHealthScoreDto["penalties"];
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-mono">{String(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function resolveBadgeClass(value: string, kind: StatusBadgeProps["kind"]) {
  const normalized = value.toLowerCase();
  if (
    ["critical", "broken", "failure", "low"].includes(normalized) ||
    (normalized === "high" && kind !== "confidence")
  ) {
    return kind === "confidence"
      ? "border-amber-500/50 bg-amber-500/10 text-amber-700"
      : "border-destructive/50 bg-destructive/10 text-destructive";
  }
  if (["medium", "frustrating", "needs_improvement", "investigating"].includes(normalized)) {
    return "border-amber-500/50 bg-amber-500/10 text-amber-700";
  }
  if (["good", "smooth", "completed", "success", "high"].includes(normalized)) {
    return kind === "confidence"
      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700"
      : "border-emerald-600/40 bg-emerald-600/10 text-emerald-700";
  }
  return "border-border bg-muted text-muted-foreground";
}

function normalizeComponents(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => typeof item !== "object")
    .slice(0, 8)
    .map(([label, item]) => ({
      label,
      value: typeof item === "number" ? item.toFixed(2) : String(item),
    }));
}

function humanize(value: string | boolean) {
  return String(value).replace(/_/g, " ");
}
