import { env } from "$env/dynamic/private";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let sqlClient: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle> | undefined;

function getDatabaseUrl() {
  const value = env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error("Missing required DATABASE_URL environment variable.");
  }

  return value;
}

export function getDb() {
  if (!db) {
    sqlClient = postgres(getDatabaseUrl(), {
      prepare: false,
      max: 1
    });
    db = drizzle(sqlClient);
  }

  return db;
}

export async function closeDb() {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = undefined;
    db = undefined;
  }
}
