import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("observability CLI scripts", () => {
  it("rejects invalid aggregate input before loading database-backed services", () => {
    const result = spawnSync(
      "pnpm",
      ["exec", "tsx", "scripts/aggregate-observability.mjs", "--days", "0"],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: "" },
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("Too small");
    expect(`${result.stderr}${result.stdout}`).not.toContain("DATABASE_URL is not set");
  });
});
