import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig(environment: "development" | "production") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", environment);

  return (await import("../../next.config")).default;
}

async function getContentSecurityPolicy(environment: "development" | "production") {
  const config = await loadConfig(environment);
  const headerRules = await config.headers?.();

  return headerRules?.[0]?.headers.find((header) => header.key === "Content-Security-Policy")
    ?.value;
}

describe("Next.js security config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("disables the X-Powered-By header", async () => {
    const config = await loadConfig("production");

    expect(config.poweredByHeader).toBe(false);
  });

  it("excludes unsafe-eval from the production CSP", async () => {
    expect(await getContentSecurityPolicy("production")).not.toContain("'unsafe-eval'");
  });

  it("keeps unsafe-eval in development for Next.js tooling", async () => {
    expect(await getContentSecurityPolicy("development")).toContain("'unsafe-eval'");
  });
});
