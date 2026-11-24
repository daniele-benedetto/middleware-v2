import { describe, expect, it } from "vitest";

import { isSafeHref } from "@/components/public/questionnaires/questionnaire-ui";

describe("isSafeHref", () => {
  it("accepts site paths and absolute http(s) URLs", () => {
    expect(isSafeHref("/")).toBe(true);
    expect(isSafeHref("/articoli/slug")).toBe(true);
    expect(isSafeHref("https://example.org/privacy")).toBe(true);
    expect(isSafeHref("HTTP://example.org")).toBe(true);
  });

  it("rejects protocol-relative URLs that would leave the site", () => {
    expect(isSafeHref("//example.org")).toBe(false);
    expect(isSafeHref("/\\example.org")).toBe(false);
  });

  it("rejects other schemes and empty values", () => {
    expect(isSafeHref(undefined)).toBe(false);
    expect(isSafeHref("")).toBe(false);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("mailto:a@b.c")).toBe(false);
  });
});
