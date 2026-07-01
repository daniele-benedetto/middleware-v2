export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(value: number | null | undefined) {
  if (!value || value < 1000) return "0s";
  const seconds = Math.round(value / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

export function formatMetric(value: number | null | undefined, unit: "ms" | "unitless") {
  if (value === null || value === undefined) return "n/a";
  if (unit === "unitless") return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}
