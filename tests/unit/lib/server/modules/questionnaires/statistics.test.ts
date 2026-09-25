import {
  calculateMedian,
  calculateQuartiles,
  createNumericDistribution,
  createTemporalDistribution,
} from "@/lib/server/modules/questionnaires/service/statistics";

const ids = {
  field: "00000000-0000-4000-8000-000000000001",
};

describe("questionnaire statistics", () => {
  it("calculates median, quartiles and IQR", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    expect(calculateQuartiles([1, 2, 3, 4])).toEqual({ q1: 1.75, q3: 3.25, iqr: 1.5 });
  });

  it("creates at most eight decimal histogram buckets with percentages", () => {
    const distribution = createNumericDistribution(
      {
        id: ids.field,
        type: "decimal",
        label: "Valore",
        required: false,
        publicResults: true,
      },
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );

    expect(distribution.discrete).toBe(false);
    expect(distribution.distribution.length).toBeLessThanOrEqual(8);
    expect(distribution.distribution.reduce((sum, bucket) => sum + bucket.percentage, 0)).toBe(100);
  });

  it("preserves UTC date keys and selects temporal buckets", () => {
    const distribution = createTemporalDistribution([
      "2026-01-01T23:00:00-05:00",
      "2026-01-02T01:00:00+01:00",
    ]);

    expect(distribution.bucketUnit).toBe("day");
    expect(distribution.distribution).toEqual([
      expect.objectContaining({ date: "2026-01-02", count: 2, percentage: 100 }),
    ]);
  });
});
