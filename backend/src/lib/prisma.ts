import { PrismaClient } from "@prisma/client";

// Uma única conexão compartilhada com o banco de dados,
// reaproveitada por todos os módulos do app, em vez de cada
// arquivo criar a sua própria (o que esgotava o limite de
// conexões do banco gratuito do Supabase).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
