import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ObservabilityMetricCard,
  ObservabilityHealthScore,
  ObservabilityInsightCard,
  ObservabilityStatusBadge,
  QualityScoreBreakdown,
  formatDuration,
  formatMetric,
  formatPercent,
} from "@/features/cms/observability/components";

describe("observability UI helpers", () => {
  it("formats percentages, durations and metrics", () => {
    expect(formatPercent(0.624)).toBe("62%");
    expect(formatPercent(null)).toBe("n/a");
    expect(formatDuration(65_000)).toBe("1m 5s");
    expect(formatMetric(1250, "ms")).toBe("1.3s");
    expect(formatMetric(0.1234, "unitless")).toBe("0.123");
  });

  it("renders status badges for observability enums", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ObservabilityStatusBadge, { value: "critical", kind: "severity" }),
        createElement(ObservabilityStatusBadge, { value: "resolved", kind: "status" }),
        createElement(ObservabilityStatusBadge, { value: "high", kind: "risk" }),
        createElement(ObservabilityStatusBadge, { value: "completed", kind: "engagement" }),
        createElement(ObservabilityStatusBadge, { value: "frustrating", kind: "quality" }),
        createElement(ObservabilityStatusBadge, { value: "low", kind: "confidence" }),
      ),
    );

    expect(html).toContain("critical");
    expect(html).toContain("resolved");
    expect(html).toContain("completed");
    expect(html).toContain("frustrating");
  });

  it("renders metric cards and quality score breakdown", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ObservabilityMetricCard, { label: "Errori", value: 3, confidence: "high" }),
        createElement(QualityScoreBreakdown, {
          score: 72,
          confidence: "medium",
          components: { completionRate: 0.8, perfPenalty: 0.1 },
        }),
      ),
    );

    expect(html).toContain("Errori");
    expect(html).toContain("72");
    expect(html).toContain("completionRate");
    expect(html).toContain("perfPenalty");
  });

  it("renders health score and insight cards with reasons and deep links", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ObservabilityHealthScore, {
          score: {
            score: 72,
            status: "watch",
            confidence: "medium",
            components: [
              { label: "versione scoring", value: "observability-insights-v1", unit: null },
            ],
            penalties: [{ label: "errori critical/high", value: 8, unit: null }],
            bonuses: [{ label: "qualita contenuti", value: 2, unit: null }],
            reasons: ["critical_high_errors"],
          },
        }),
        createElement(ObservabilityInsightCard, {
          insight: {
            id: "high_interest_poor_performance:article-1",
            type: "high_interest_poor_performance",
            title: "Contenuto forte frenato dalla performance",
            description: "Un contenuto qualificato ha performance frustrante.",
            severity: "high",
            score: 81,
            confidence: "high",
            reasons: ["quality_score_high", "poor_performance_high"],
            primaryEntity: {
              type: "content",
              id: "article-1",
              label: "/articoli/test",
              href: "/cms/telemetry?path=%2Farticoli%2Ftest",
            },
            relatedEntities: [],
            metrics: [{ label: "quality score", value: 82, unit: null }],
            deepLinks: [
              { label: "Apri performance", href: "/cms/performance?path=%2Farticoli%2Ftest" },
            ],
            dateRange: {
              from: "2026-07-01T00:00:00.000Z",
              to: "2026-08-01T00:00:00.000Z",
            },
          },
        }),
      ),
    );

    expect(html).toContain("Health score");
    expect(html).toContain("critical high errors");
    expect(html).toContain("Contenuto forte frenato dalla performance");
    expect(html).toContain("Apri performance");
  });
});
