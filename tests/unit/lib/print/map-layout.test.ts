import { describe, expect, it } from "vitest";

import { buildPrintMapPoints } from "@/lib/print/map-layout";

describe("buildPrintMapPoints", () => {
  it("orders points and preserves their relative geographic positions inside the print plate", () => {
    const points = buildPrintMapPoints([
      {
        id: "south-east",
        title: "Sud est",
        description: "",
        latitude: "44.61",
        longitude: "10.95",
        sortOrder: 2,
      },
      {
        id: "north-west",
        title: "Nord ovest",
        description: "",
        latitude: "44.71",
        longitude: "10.85",
        sortOrder: 1,
      },
    ]);

    expect(points).toEqual([
      expect.objectContaining({ id: "north-west", x: 14, y: 14 }),
      expect.objectContaining({ id: "south-east", x: 86, y: 86 }),
    ]);
  });

  it("keeps coincident points centered instead of producing invalid coordinates", () => {
    const points = buildPrintMapPoints([
      {
        id: "one",
        title: "Uno",
        description: "",
        latitude: "44.65",
        longitude: "10.92",
        sortOrder: 0,
      },
    ]);

    expect(points[0]).toMatchObject({ x: 14, y: 86 });
  });
});
