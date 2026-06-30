import "dotenv/config";

import pg from "pg";

const { Pool } = pg;

export function readPositiveIntegerEnv(name, defaultValue) {
  const rawValue = process.env[name];
  const value = rawValue === undefined || rawValue === "" ? defaultValue : Number(rawValue);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function normalizeConnectionString(rawValue) {
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

export function createTelemetryPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({ connectionString: normalizeConnectionString(connectionString) });
}
