// lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// 1. Establish the native PostgreSQL connection pool configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Instantiate the Prisma PostgreSQL runtime adapter wrapper
const adapter = new PrismaPg(pool);

// 3. Prevent connection leaks during Next.js Turbopack hot-reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 👇 FIXED: Wrapped inside the explicit constructor options object
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}