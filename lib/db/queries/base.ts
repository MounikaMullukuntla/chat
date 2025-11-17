import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// biome-ignore lint: Forbidden non-null assertion.
// Configure for serverless environment (Vercel)
const client = postgres(process.env.POSTGRES_URL!, {
  max: 1, // Limit connection pool for serverless (each instance = 1 connection)
  prepare: false, // Disable prepared statements (not compatible with serverless)
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Fail fast on connection issues (10 seconds)
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false, // Enable SSL for production (Supabase requires SSL)
});

export const db = drizzle(client);
