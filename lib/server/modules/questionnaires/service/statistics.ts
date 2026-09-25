import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";

export type NumericDistributionBucket = {
  minimum: number;
  maximum: number;
  count: number;
  percentage: number;
};

export type TemporalDistributionBucket = {
  date: string;
  start: string;
  end: string;
  count: number;
  percentage: number;
};

export type TemporalBucketUnit = "day" | "week" | "month" | "year";
export type TemporalMeaning = "distribution" | "event";

export function calculatePercentage(count: number, total: number) {
  return total === 0 ? 0 : (roundStatistic((count / total) * 100) ?? 0);
}

export function roundStatistic(value: number | null) {
  return value === null ? null : Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateMean(values: number[]) {
  if (values.length === 0) return null;
  return roundStatistic(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function quantile(values: number[], proportion: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const value =
    lower === upper
      ? sorted[lower]
      : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  return roundStatistic(value);
}

export function calculateMedian(values: number[]) {
  return quantile(values, 0.5);
}

export function calculateQuartiles(values: number[]) {
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  return { q1, q3, iqr: q1 === null || q3 === null ? null : roundStatistic(q3 - q1) };
}

function isDiscreteField(field: QuestionnaireField) {
  if (field.type === "scale") return true;
  return field.type === "integer" && field.integerVisualization !== "histogram";
}

export function isDiscreteDistribution(field: QuestionnaireField) {
  return field.type === "scale" || (field.type === "integer" && isDiscreteField(field));
}

export function createNumericDistribution(
  field: Extract<QuestionnaireField, { type: "scale" | "integer" | "decimal" }>,
  values: number[],
): { discrete: boolean; distribution: NumericDistributionBucket[] } {
  if (values.length === 0) return { discrete: isDiscreteDistribution(field), distribution: [] };

  const discrete = isDiscreteDistribution(field);
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  if (discrete) {
    if (field.type === "scale") {
      const step = field.step ?? 1;
      for (let value = field.min; value <= field.max; value += step) {
        counts.set(roundStatistic(value) ?? value, counts.get(roundStatistic(value) ?? value) ?? 0);
      }
    }

    return {
      discrete: true,
      distribution: [...counts]
        .sort(([left], [right]) => left - right)
        .map(([value, count]) => ({
          minimum: roundStatistic(value) ?? value,
          maximum: roundStatistic(value) ?? value,
          count,
          percentage: calculatePercentage(count, values.length),
        })),
    };
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) {
    return {
      discrete: false,
      distribution: [
        {
          minimum: roundStatistic(minimum) ?? minimum,
          maximum: roundStatistic(maximum) ?? maximum,
          count: values.length,
          percentage: 100,
        },
      ],
    };
  }

  const bucketCount = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(values.length))));
  const bucketSize = (maximum - minimum) / bucketCount;
  const distribution = Array.from({ length: bucketCount }, (_, index) => ({
    minimum: minimum + bucketSize * index,
    maximum: index === bucketCount - 1 ? maximum : minimum + bucketSize * (index + 1),
    count: 0,
    percentage: 0,
  }));

  values.forEach((value) => {
    const index = Math.min(bucketCount - 1, Math.floor((value - minimum) / bucketSize));
    distribution[index].count += 1;
  });

  return {
    discrete: false,
    distribution: distribution.map((bucket) => ({
      ...bucket,
      minimum: roundStatistic(bucket.minimum) ?? bucket.minimum,
      maximum: roundStatistic(bucket.maximum) ?? bucket.maximum,
      percentage: calculatePercentage(bucket.count, values.length),
    })),
  };
}

function dateKey(value: string) {
  return value.length === 10 ? value : new Date(value).toISOString().slice(0, 10);
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function startOfYear(value: string) {
  return `${value.slice(0, 4)}-01-01`;
}

function endOfBucket(value: string, unit: TemporalBucketUnit) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + (unit === "day" ? 1 : unit === "week" ? 7 : 0));
  if (unit === "month") date.setUTCMonth(date.getUTCMonth() + 1);
  if (unit === "year") date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function bucketKey(value: string, unit: TemporalBucketUnit) {
  if (unit === "day") return dateKey(value);
  if (unit === "week") return startOfWeek(value);
  if (unit === "month") return startOfMonth(value);
  return startOfYear(value);
}

function selectBucketUnit(spanInDays: number): TemporalBucketUnit {
  if (spanInDays <= 31) return "day";
  if (spanInDays <= 180) return "week";
  if (spanInDays <= 730) return "month";
  return "year";
}

function createBucketKeys(start: string, end: string, unit: TemporalBucketUnit) {
  const keys: string[] = [];
  let current = start;
  while (current <= end && keys.length < 120) {
    keys.push(current);
    current = endOfBucket(current, unit);
  }
  return keys;
}

export function createTemporalDistribution(
  values: string[],
  temporalMeaning: TemporalMeaning = "distribution",
): {
  bucketUnit: TemporalBucketUnit;
  includeEmptyBuckets: boolean;
  distribution: TemporalDistributionBucket[];
} {
  if (values.length === 0) {
    return {
      bucketUnit: "day",
      includeEmptyBuckets: temporalMeaning === "event",
      distribution: [],
    };
  }

  const dates = values.map(dateKey).sort();
  const first = new Date(`${dates[0]}T00:00:00.000Z`).getTime();
  const last = new Date(`${dates.at(-1)}T00:00:00.000Z`).getTime();
  const spanInDays = (last - first) / 86_400_000;
  const bucketUnit = selectBucketUnit(spanInDays);
  const counts = new Map<string, number>();

  dates.forEach((value) => {
    const key = bucketKey(value, bucketUnit);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const firstBucket = bucketKey(dates[0], bucketUnit);
  const lastBucket = bucketKey(dates.at(-1) ?? dates[0], bucketUnit);
  const allBucketKeys = createBucketKeys(firstBucket, lastBucket, bucketUnit);
  const includeEmptyBuckets = temporalMeaning === "event" && allBucketKeys.at(-1) === lastBucket;
  const keys = includeEmptyBuckets ? allBucketKeys : [...counts.keys()].sort();

  return {
    bucketUnit,
    includeEmptyBuckets,
    distribution: keys.map((date) => {
      const count = counts.get(date) ?? 0;
      return {
        date,
        start: date,
        end: endOfBucket(date, bucketUnit),
        count,
        percentage: calculatePercentage(count, dates.length),
      };
    }),
  };
}

export function createHourlyDistribution(values: string[]) {
  const counts = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Rome",
  });
  for (let hour = 0; hour < 24; hour += 1) counts.set(hour, 0);
  values.forEach((value) => {
    const hour = Number(
      formatter.formatToParts(new Date(value)).find((part) => part.type === "hour")?.value ?? 0,
    );
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  });

  return [...counts].map(([hour, count]) => ({
    hour,
    count,
    percentage: calculatePercentage(count, values.length),
  }));
}
