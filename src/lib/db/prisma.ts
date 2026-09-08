import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * PostgreSQL connection pool with a fixed size of 10 connections per server
 * process. Prisma talks to the database through this pool via the pg driver
 * adapter, which bounds concurrent connections and prevents connection
 * exhaustion under concurrent create-account (and other) traffic.
 */
function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  return new Pool({
    connectionString: url,
    max: 10,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma is instantiated once and reused across hot reloads / module calls.
 * The pg pool (size 10) is created once and shared for the process lifetime.
 */
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(createPool()),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };