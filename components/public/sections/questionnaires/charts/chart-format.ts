const percentageFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const numberFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

export function formatChartPercentage(value: number) {
  return `${percentageFormatter.format(value)}%`;
}

export function formatChartNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatChartRange(minimum: number, maximum: number) {
  return minimum === maximum
    ? formatChartNumber(minimum)
    : `${formatChartNumber(minimum)}–${formatChartNumber(maximum)}`;
}

/** Upper bound of a percentage axis: the next multiple of ten above the tallest mark. */
export function getPercentageAxisMaximum(percentages: readonly number[]) {
  const highest = Math.max(0, ...percentages);
  return Math.min(100, Math.max(10, Math.ceil(highest / 10) * 10));
}
