import { Pool } from "pg";

// Vercel's Postgres (Neon) integration sets DATABASE_URL (pooled) and POSTGRES_URL.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Reuse one pool across hot reloads in dev and warm serverless invocations.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const db =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
  });

globalForDb.pgPool = db;
