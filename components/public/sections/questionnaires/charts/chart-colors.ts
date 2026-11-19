/**
 * Colour roles for the questionnaire charts, resolved from the theme tokens in
 * `app/globals.css` so they follow whatever surface/ink the active theme defines.
 *
 * A single series (scale values, numeric bins, hours, periods, choice options) uses one
 * colour: position and length carry the data, so a hue per bar would encode nothing.
 * The secondary colour exists only for the two slices of the boolean pie.
 */
export const CHART_SERIES_COLOR = "var(--chart-1)";
export const CHART_SECONDARY_COLOR = "var(--chart-2)";
export const CHART_HOVER_BAND_COLOR = "var(--muted)";

/**
 * `accessibilityLayer` makes the chart surface focusable. A pointer click therefore moves
 * focus onto it, and Recharts treats a focused chart as keyboard-driven: the tooltip stays
 * pinned to the first datum until focus leaves. Blurring on click keeps pointer users on
 * the hover tooltip while keyboard users (Tab + arrows) still get the accessible one.
 */
export function blurChartFocus() {
  const activeElement = document.activeElement as (Element & { blur?: () => void }) | null;
  activeElement?.blur?.();
}
