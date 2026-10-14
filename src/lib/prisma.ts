import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { balsathiPrisma?: PrismaClient };

export const prisma = globalForPrisma.balsathiPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.balsathiPrisma = prisma;
