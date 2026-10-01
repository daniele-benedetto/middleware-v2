import { describe, expect, it } from "vitest";

import { buildPrintMapPlate, printMapPlateOptions } from "@/lib/print/map-plate";

const points = [
  { latitude: 44.64, longitude: 10.91 },
  { latitude: 44.66, longitude: 10.94 },
];

describe("buildPrintMapPlate", () => {
  it("chooses the closest zoom that keeps every marker in the safe area", () => {
    const plate = buildPrintMapPlate(points);
    const safeLeft = 50 - (printMapPlateOptions.safeWidthMm / printMapPlateOptions.widthMm) * 50;
    const safeTop = 50 - (printMapPlateOptions.safeHeightMm / printMapPlateOptions.heightMm) * 50;

    expect(plate.zoom).toBe(14);
    for (const marker of plate.markers) {
      expect(marker.left).toBeGreaterThanOrEqual(safeLeft);
      expect(marker.left).toBeLessThanOrEqual(100 - safeLeft);
      expect(marker.top).toBeGreaterThanOrEqual(safeTop);
      expect(marker.top).toBeLessThanOrEqual(100 - safeTop);
    }
    expect(plate.markers.map((marker) => marker.label)).toEqual(["01", "02"]);
  });

  it("covers the whole plate with OpenStreetMap tiles", () => {
    const plate = buildPrintMapPlate(points);

    expect(
      plate.tiles.every((tile) =>
        /^https:\/\/[abc]\.tile\.openstreetmap\.org\/14\//.test(tile.url),
      ),
    ).toBe(true);
    expect(Math.min(...plate.tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0);
    expect(Math.min(...plate.tiles.map((tile) => tile.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...plate.tiles.map((tile) => tile.left + tile.width))).toBeGreaterThanOrEqual(
      100,
    );
    expect(Math.max(...plate.tiles.map((tile) => tile.top + tile.height))).toBeGreaterThanOrEqual(
      100,
    );
  });

  it("centers an empty map on Modena and uses the maximum zoom for a single point", () => {
    expect(buildPrintMapPlate([]).zoom).toBe(13);
    expect(buildPrintMapPlate([points[0]!]).zoom).toBe(printMapPlateOptions.maxZoom);
  });
});
