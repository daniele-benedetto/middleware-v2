import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const retentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS);

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

if (!Number.isInteger(retentionDays) || retentionDays < 1) {
  throw new Error("AUDIT_LOG_RETENTION_DAYS must be a positive integer");
}

function normalizeConnectionString(rawValue) {
  try {
    const url = new URL(rawValue);
    const sslmode = url.searchParams.get("sslmode");
    const useLibpqCompat = url.searchParams.get("uselibpqcompat");

    if (sslmode === "require" && useLibpqCompat !== "true") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    return rawValue;
  }

  return rawValue;
}

const pool = new Pool({ connectionString: normalizeConnectionString(connectionString) });

try {
  const result = await pool.query(
    'DELETE FROM "audit_logs" WHERE "createdAt" < NOW() - ($1::int * INTERVAL \'1 day\')',
    [retentionDays],
  );

  console.log(`Pruned ${result.rowCount} audit log entries older than ${retentionDays} days.`);
} finally {
  await pool.end();
}
