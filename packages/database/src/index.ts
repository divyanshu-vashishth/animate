import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

export * from "./schema.js";

const sourceDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(sourceDir, "../../..", ".env") });

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString?: string) {
  if (dbInstance) return dbInstance;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(url);
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
