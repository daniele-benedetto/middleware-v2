const GOLDEN_ANGLE = 137.507764;
const INITIAL_HUE = 25;

/**
 * Produces distinct, editorially muted category colors from a stable key order.
 * The golden angle spreads hues evenly as categories are added.
 */
export function getGoldenAngleChartColors(keys: readonly string[]) {
  return new Map(
    keys.map((key, index) => [
      key,
      `oklch(0.53 0.16 ${(INITIAL_HUE + index * GOLDEN_ANGLE) % 360})`,
    ]),
  );
}

export function getSingleSeriesChartColor() {
  return getGoldenAngleChartColors(["series"]).get("series")!;
}
