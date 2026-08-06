import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton.
 *
 * Next.js dev mode hot-reloads modules, which would otherwise create a new
 * PrismaClient (and a new connection pool) on every reload until Postgres
 * refuses connections. Caching on `globalThis` avoids that.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
