import { pruneTelemetry } from "./prune-telemetry.mjs";
import { refreshTelemetryAggregates } from "./refresh-telemetry-aggregates.mjs";
import { createTelemetryPool, readPositiveIntegerEnv } from "./telemetry-db.mjs";

const aggregateDays = readPositiveIntegerEnv("TELEMETRY_AGGREGATE_DAYS", 7);
const retentionDays = readPositiveIntegerEnv("TELEMETRY_RETENTION_DAYS");
const pool = createTelemetryPool();

try {
  const aggregateResult = await refreshTelemetryAggregates({ pool, days: aggregateDays });
  const pruneResult = await pruneTelemetry({ pool, retentionDays });

  console.log(
    `Telemetry jobs completed: ` +
      `${aggregateResult.insertedAnalyticsAggregates} analytics aggregates, ` +
      `${aggregateResult.insertedWebVitalAggregates} web vital aggregates, ` +
      `${pruneResult.deletedAnalyticsEvents} analytics events pruned, ` +
      `${pruneResult.deletedWebVitals} web vitals pruned, ` +
      `${pruneResult.deletedErrorLogs} error logs pruned.`,
  );
} finally {
  await pool.end();
}
