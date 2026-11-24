import { describe, expect, it } from "vitest";

import {
  normalizeDayKey,
  romeDayEndIso,
  romeDayStartIso,
} from "@/features/cms/questionnaires/utils/rome-day-range";

describe("rome day range", () => {
  it("resolves winter days at UTC+1", () => {
    expect(romeDayStartIso("2026-01-15")).toBe("2026-01-14T23:00:00.000Z");
    expect(romeDayEndIso("2026-01-15")).toBe("2026-01-15T22:59:59.999Z");
  });

  it("resolves summer days at UTC+2", () => {
    expect(romeDayStartIso("2026-07-01")).toBe("2026-06-30T22:00:00.000Z");
    expect(romeDayEndIso("2026-07-01")).toBe("2026-07-01T21:59:59.999Z");
  });

  it("covers the 23-hour and 25-hour days of the DST transitions", () => {
    expect(romeDayStartIso("2026-03-29")).toBe("2026-03-28T23:00:00.000Z");
    expect(romeDayEndIso("2026-03-29")).toBe("2026-03-29T21:59:59.999Z");
    expect(romeDayStartIso("2026-10-25")).toBe("2026-10-24T22:00:00.000Z");
    expect(romeDayEndIso("2026-10-25")).toBe("2026-10-25T22:59:59.999Z");
  });

  it("rejects values that are not calendar days", () => {
    expect(normalizeDayKey("2026-02-30")).toBeUndefined();
    expect(normalizeDayKey("15/01/2026")).toBeUndefined();
    expect(normalizeDayKey(null)).toBeUndefined();
    expect(normalizeDayKey("2026-01-15")).toBe("2026-01-15");
    expect(romeDayStartIso("nope")).toBeUndefined();
  });
});
