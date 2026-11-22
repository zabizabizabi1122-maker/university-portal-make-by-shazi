import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Read process.env directly here: Prisma is constructed at module evaluation,
// and validating env vars at build time would break `next build` on platforms
// that only inject secrets at runtime.
const isDevelopment = process.env.NODE_ENV === 'development'

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: isDevelopment ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
