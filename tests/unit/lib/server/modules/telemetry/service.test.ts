import { telemetryService } from "@/lib/server/modules/telemetry/service";

describe("telemetry service helpers", () => {
  it("derives stable visitor hashes within the same UTC day", () => {
    const first = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-06-30T10:00:00.000Z"),
      saltSecret: "secret",
    });
    const second = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-06-30T23:00:00.000Z"),
      saltSecret: "secret",
    });

    expect(second).toBe(first);
  });

  it("rotates visitor hashes across UTC days", () => {
    const first = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-06-30T23:59:00.000Z"),
      saltSecret: "secret",
    });
    const second = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-07-01T00:01:00.000Z"),
      saltSecret: "secret",
    });

    expect(second).not.toBe(first);
  });

  it("normalizes paths without query strings", () => {
    expect(
      telemetryService.normalizeTelemetryPath(
        "https://middleware.media/articoli/test?token=secret",
      ),
    ).toBe("/articoli/test");
  });

  it("skips technical paths", () => {
    expect(telemetryService.shouldSkipTelemetryPath("/api/telemetry")).toBe(true);
    expect(telemetryService.shouldSkipTelemetryPath("/_next/static/app.js")).toBe(true);
    expect(telemetryService.shouldSkipTelemetryPath("/cms/articles")).toBe(true);
    expect(telemetryService.shouldSkipTelemetryPath("/articoli/test")).toBe(false);
  });

  it("normalizes internal referrers to paths and external referrers to hostnames", () => {
    expect(
      telemetryService.normalizeTelemetryReferrer(
        "https://middleware.media/articoli/test?token=secret",
        "https://middleware.media",
      ),
    ).toBe("/articoli/test");
    expect(
      telemetryService.normalizeTelemetryReferrer(
        "https://search.example.com/results?q=middleware",
        "https://middleware.media",
      ),
    ).toBe("search.example.com");
  });

  it("uses normalized error messages for fingerprints", () => {
    const first = telemetryService.createErrorFingerprint({
      source: "server",
      name: "Error",
      message: "Missing id 550e8400-e29b-41d4-a716-446655440000",
      path: "/api/test",
    });
    const second = telemetryService.createErrorFingerprint({
      source: "server",
      name: "Error",
      message: "Missing id 550e8400-e29b-41d4-a716-446655440111",
      path: "/api/test",
    });

    expect(second).toBe(first);
  });
});
