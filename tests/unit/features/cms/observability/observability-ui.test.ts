import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ObservabilityMetricCard,
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
});
