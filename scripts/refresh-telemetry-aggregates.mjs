import { createTelemetryPool, readPositiveIntegerEnv } from "./telemetry-db.mjs";

export async function refreshTelemetryAggregates({ pool, days }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const deleteAnalyticsResult = await client.query(
      `DELETE FROM "telemetry_daily_aggregates"
       WHERE "date" >= date_trunc('day', NOW() - ($1::int * INTERVAL '1 day'))`,
      [days],
    );

    const insertAnalyticsResult = await client.query(
      `INSERT INTO "telemetry_daily_aggregates" (
         "id",
         "date",
         "event",
         "path",
         "referrer",
         "country",
         "views",
         "visitors",
         "updatedAt"
       )
       SELECT
         gen_random_uuid()::text,
         date_trunc('day', "createdAt") AS "date",
         "event",
         "path",
         COALESCE("referrer", '') AS "referrer",
         COALESCE("country", '') AS "country",
         COUNT(*)::int AS "views",
         COUNT(DISTINCT "visitorHash")::int AS "visitors",
         NOW() AS "updatedAt"
       FROM "analytics_events"
       WHERE "createdAt" >= date_trunc('day', NOW() - ($1::int * INTERVAL '1 day'))
       GROUP BY
         date_trunc('day', "createdAt"),
         "event",
         "path",
         COALESCE("referrer", ''),
         COALESCE("country", '')`,
      [days],
    );

    const deleteWebVitalsResult = await client.query(
      `DELETE FROM "web_vital_daily_aggregates"
       WHERE "date" >= date_trunc('day', NOW() - ($1::int * INTERVAL '1 day'))`,
      [days],
    );

    const insertWebVitalsResult = await client.query(
      `INSERT INTO "web_vital_daily_aggregates" (
         "id",
         "date",
         "path",
         "name",
         "count",
         "p50",
         "p75",
         "p95",
         "good",
         "needsImprovement",
         "poor",
         "updatedAt"
       )
       SELECT
         gen_random_uuid()::text,
         date_trunc('day', "createdAt") AS "date",
         "path",
         "name",
         COUNT(*)::int AS "count",
         percentile_cont(0.50) WITHIN GROUP (ORDER BY "value")::double precision AS "p50",
         percentile_cont(0.75) WITHIN GROUP (ORDER BY "value")::double precision AS "p75",
         percentile_cont(0.95) WITHIN GROUP (ORDER BY "value")::double precision AS "p95",
         COUNT(*) FILTER (WHERE "rating" = 'good')::int AS "good",
         COUNT(*) FILTER (WHERE "rating" = 'needs-improvement')::int AS "needsImprovement",
         COUNT(*) FILTER (WHERE "rating" = 'poor')::int AS "poor",
         NOW() AS "updatedAt"
       FROM "web_vitals"
       WHERE "createdAt" >= date_trunc('day', NOW() - ($1::int * INTERVAL '1 day'))
       GROUP BY date_trunc('day', "createdAt"), "path", "name"`,
      [days],
    );

    await client.query("COMMIT");

    return {
      deletedAnalyticsAggregates: deleteAnalyticsResult.rowCount,
      insertedAnalyticsAggregates: insertAnalyticsResult.rowCount,
      deletedWebVitalAggregates: deleteWebVitalsResult.rowCount,
      insertedWebVitalAggregates: insertWebVitalsResult.rowCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const days = readPositiveIntegerEnv("TELEMETRY_AGGREGATE_DAYS", 7);
  const pool = createTelemetryPool();

  try {
    const result = await refreshTelemetryAggregates({ pool, days });

    console.log(
      `Refreshed telemetry aggregates for the last ${days} days: ` +
        `${result.insertedAnalyticsAggregates} analytics rows inserted ` +
        `(${result.deletedAnalyticsAggregates} deleted), ` +
        `${result.insertedWebVitalAggregates} web vital rows inserted ` +
        `(${result.deletedWebVitalAggregates} deleted).`,
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
