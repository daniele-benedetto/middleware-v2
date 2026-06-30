import { createTelemetryPool, readPositiveIntegerEnv } from "./telemetry-db.mjs";

export async function pruneTelemetry({ pool, retentionDays }) {
  const analyticsResult = await pool.query(
    `DELETE FROM "analytics_events"
     WHERE "createdAt" < NOW() - ($1::int * INTERVAL '1 day')`,
    [retentionDays],
  );

  const webVitalsResult = await pool.query(
    `DELETE FROM "web_vitals"
     WHERE "createdAt" < NOW() - ($1::int * INTERVAL '1 day')`,
    [retentionDays],
  );

  const errorLogsResult = await pool.query(
    `DELETE FROM "error_logs"
     WHERE "lastSeenAt" < NOW() - ($1::int * INTERVAL '1 day')`,
    [retentionDays],
  );

  return {
    deletedAnalyticsEvents: analyticsResult.rowCount,
    deletedWebVitals: webVitalsResult.rowCount,
    deletedErrorLogs: errorLogsResult.rowCount,
  };
}

async function main() {
  const retentionDays = readPositiveIntegerEnv("TELEMETRY_RETENTION_DAYS");
  const pool = createTelemetryPool();

  try {
    const result = await pruneTelemetry({ pool, retentionDays });

    console.log(
      `Pruned telemetry older than ${retentionDays} days: ` +
        `${result.deletedAnalyticsEvents} analytics events, ` +
        `${result.deletedWebVitals} web vitals, ` +
        `${result.deletedErrorLogs} error logs.`,
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
