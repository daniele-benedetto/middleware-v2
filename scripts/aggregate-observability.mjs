import "dotenv/config";

const { observabilityAggregationJobInputSchema } =
  await import("../lib/server/modules/observability-aggregates/schema/index.ts");

function readArgs(argv) {
  const input = { domains: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--from") input.from = next;
    if (arg === "--to") input.to = next;
    if (arg === "--days") input.days = Number(next);
    if (arg === "--domain") input.domains = [next];
    if (arg === "--domains") input.domains = next.split(",").map((item) => item.trim());
    if (arg === "--force") input.force = true;
    if (arg === "--dry-run") input.dryRun = true;
    if (arg.startsWith("--") && next && !next.startsWith("--")) index += 1;
  }
  return input;
}

const parsed = observabilityAggregationJobInputSchema.parse(readArgs(process.argv.slice(2)));
const { observabilityAggregatesService } =
  await import("../lib/server/modules/observability-aggregates/service/index.ts");
const result = await observabilityAggregatesService.aggregate(parsed);

console.log(JSON.stringify(result, null, 2));
