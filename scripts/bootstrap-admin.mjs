import "dotenv/config";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { Pool } = pg;

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || null;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

if (!email) {
  throw new Error("BOOTSTRAP_ADMIN_EMAIL is required");
}

if (!password || password.length < 8) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters");
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
  const existingAdmin = await pool.query('SELECT id FROM "user" WHERE role = $1 LIMIT 1', [
    "ADMIN",
  ]);

  if (existingAdmin.rowCount > 0) {
    console.log("Admin already exists; bootstrap skipped.");
    process.exit(0);
  }

  const existingUser = await pool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email]);

  if (existingUser.rowCount > 0) {
    throw new Error("A user with BOOTSTRAP_ADMIN_EMAIL already exists but is not ADMIN");
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await pool.query("BEGIN");
  await pool.query(
    'INSERT INTO "user" (id, email, name, role, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW(), NOW())',
    [userId, email, name, "ADMIN"],
  );
  await pool.query(
    'INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
    [randomUUID(), userId, "credential", userId, passwordHash],
  );
  await pool.query("COMMIT");

  console.log(`Admin bootstrapped: ${email}`);
} catch (error) {
  await pool.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await pool.end();
}
