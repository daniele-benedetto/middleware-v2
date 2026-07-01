import { describe, expect, it } from "vitest";

import {
  parseObservabilityAuditListSearchParams,
  parseObservabilityErrorsListSearchParams,
} from "@/lib/cms/query";

describe("observability CMS query parsers", () => {
  it("parses errors filters and drops invalid enum values", () => {
    const input = parseObservabilityErrorsListSearchParams({
      page: "2",
      pageSize: "25",
      q: "upload",
      severity: "critical",
      status: "open",
      source: "server",
      impactArea: "media",
      userImpact: "blocked_action",
      regression: "true",
      sortBy: "priorityScore",
      sortOrder: "desc",
    });
    const invalid = parseObservabilityErrorsListSearchParams({
      severity: "fatal",
      status: "done",
      source: "bot",
      regression: "maybe",
    });

    expect(input.page).toBe(2);
    expect(input.pageSize).toBe(25);
    expect(input.query).toMatchObject({
      q: "upload",
      severity: "critical",
      status: "open",
      source: "server",
      impactArea: "media",
      userImpact: "blocked_action",
      regression: true,
      sortBy: "priorityScore",
      sortOrder: "desc",
    });
    expect(invalid.query?.severity).toBeUndefined();
    expect(invalid.query?.status).toBeUndefined();
    expect(invalid.query?.source).toBeUndefined();
    expect(invalid.query?.regression).toBeUndefined();
  });

  it("parses audit filters and boolean public impact", () => {
    const input = parseObservabilityAuditListSearchParams({
      outcome: "FAILURE",
      riskLevel: "high",
      resourceType: "article",
      action: "publish",
      publicImpact: "true",
      sortBy: "riskLevel",
    });

    expect(input.query).toMatchObject({
      outcome: "FAILURE",
      riskLevel: "high",
      resourceType: "article",
      action: "publish",
      publicImpact: true,
      sortBy: "riskLevel",
    });
  });
});
