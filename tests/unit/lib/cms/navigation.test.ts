import { describe, expect, it } from "vitest";

import { cmsNavigation } from "@/lib/cms/navigation";

describe("cmsNavigation observability routes", () => {
  it("exposes qualitative observability routes without analytics legacy route", () => {
    const hrefs = cmsNavigation.map((item) => item.href);

    expect(hrefs).toContain("/cms/observability");
    expect(hrefs).toContain("/cms/telemetry");
    expect(hrefs).toContain("/cms/performance");
    expect(hrefs).toContain("/cms/errors");
    expect(hrefs).toContain("/cms/audit");
    expect(hrefs).not.toContain("/cms/analytics");
  });
});
