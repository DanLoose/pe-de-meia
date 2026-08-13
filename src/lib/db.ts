import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when the Prisma schema gains fields/models that stale HMR clients miss. */
const PRISMA_CLIENT_GENERATION = 3;

export function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration?: number;
};

function isPrismaClientReady(client: PrismaClient): boolean {
  return "cardAccount" in client && "cardInvoice" in client;
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    globalForPrisma.prismaGeneration === PRISMA_CLIENT_GENERATION &&
    isPrismaClientReady(cached)
  ) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
  }
  return client;
}

export const prisma = getPrismaClient();
