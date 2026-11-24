const percentageFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const numberFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

export function formatAnalysisPercentage(value: number) {
  return `${percentageFormatter.format(value)}%`;
}

export function formatAnalysisNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatAnalysisRange(minimum: number, maximum: number) {
  return minimum === maximum
    ? formatAnalysisNumber(minimum)
    : `${formatAnalysisNumber(minimum)}–${formatAnalysisNumber(maximum)}`;
}
