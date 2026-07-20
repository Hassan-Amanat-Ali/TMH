import { PrismaClient } from "@/lib/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  var __tmhPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Configure it in .env (mysql://...).");
  }
  // Prisma 7 requires a driver adapter for a direct database connection.
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

function getOrCreatePrismaClient(): PrismaClient {
  if (global.__tmhPrisma) {
    return global.__tmhPrisma;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    global.__tmhPrisma = client;
  }
  return client;
}

// Reuse a single client across hot reloads / serverless invocations, but do
// not instantiate it during module evaluation. Next build may import routes
// without DATABASE_URL; runtime DB access should be the first touch.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreatePrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;

/**
 * Back-compat accessor. Older routes call getPrismaClient() and tolerate a
 * null result when the database is unreachable. New code should import
 * `prisma` directly and let errors surface.
 */
export function getPrismaClient(): PrismaClient | null {
  try {
    return getOrCreatePrismaClient();
  } catch {
    return null;
  }
}
