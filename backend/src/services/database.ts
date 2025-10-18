import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client for database operations
 *
 * Usage:
 * import prisma from './services/database';
 *
 * const users = await prisma.user.findMany();
 */

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });

    // Handle hot reload in development
    if (process.env.NODE_ENV === 'development') {
      (global as any).prisma = prisma;
    }
  }

  return prisma;
}

// Export singleton instance
const prismaClient = getPrismaClient();
export default prismaClient;
