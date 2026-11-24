import { describe, expect, it, vi } from "vitest";

import { createSingleFlightThrottle } from "@/lib/server/modules/search/service/single-flight-throttle";

describe("createSingleFlightThrottle", () => {
  it("shares one in-flight run between concurrent callers", async () => {
    const task = vi.fn(async () => {});
    const run = createSingleFlightThrottle(task, 1_000, () => 0);

    await Promise.all([run(), run(), run()]);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it("skips runs inside the interval and runs again after it", async () => {
    let time = 0;
    const task = vi.fn(async () => {});
    const run = createSingleFlightThrottle(task, 1_000, () => time);

    await run();
    time = 999;
    await run();
    expect(task).toHaveBeenCalledTimes(1);

    time = 1_000;
    await run();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("retries immediately after a failed run", async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    const run = createSingleFlightThrottle(task, 1_000, () => 0);

    await expect(run()).rejects.toThrow("boom");
    await run();

    expect(task).toHaveBeenCalledTimes(2);
  });
});
