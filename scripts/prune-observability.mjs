import "dotenv/config";

const { observabilityAggregatesService } =
  await import("../lib/server/modules/observability-aggregates/index.ts");

const result = await observabilityAggregatesService.prune();

console.log(JSON.stringify(result, null, 2));
