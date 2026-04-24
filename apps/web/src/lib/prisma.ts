import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Lazy proxy: PrismaClient is only instantiated on first property access,
// not at module import time. This prevents build failures when DATABASE_URL
// is unavailable during Next.js static analysis.
export const prisma = new Proxy({} as unknown as PrismaClient, {
  get(_: unknown, prop: string | symbol) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient();
    }
    return (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
