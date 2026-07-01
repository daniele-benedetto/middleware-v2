import "dotenv/config";

const { observabilityAggregationJobInputSchema, observabilityAggregatesService } =
  await import("../lib/server/modules/observability-aggregates/index.ts");

const aggregateDays = Number(process.env.OBSERVABILITY_AGGREGATE_DAYS ?? 7);
const input = observabilityAggregationJobInputSchema.parse({
  days: aggregateDays,
  domains: ["all"],
});
const aggregate = await observabilityAggregatesService.aggregate(input);
const prune = await observabilityAggregatesService.prune();

console.log(JSON.stringify({ aggregate, prune }, null, 2));
