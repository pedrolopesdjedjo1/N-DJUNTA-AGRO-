import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Todas as consultas aqui são agregadas (contagens e médias) - nunca
// devolvem dados pessoais de um usuário específico, só números gerais.
export async function getOverview() {
  const [usersByRole, productsByCategory, productsByLocation, totalTransactions] =
    await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
      prisma.product.groupBy({ by: ["category"], _count: { category: true } }),
      prisma.product.groupBy({
        by: ["location"],
        where: { location: { not: null } },
        _count: { location: true },
      }),
      prisma.payment.count({ where: { status: "CONFIRMADO" } }),
    ]);

  return {
    usersByRole,
    productsByCategory,
    productsByLocation,
    totalConfirmedTransactions: totalTransactions,
  };
}

// Crescimento de usuários por mês (últimos 12 meses)
export async function getUserGrowth() {
  const users = await prisma.user.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const growth = new Map<string, number>();

  for (const user of users) {
    const monthKey = `${user.createdAt.getFullYear()}-${String(
      user.createdAt.getMonth() + 1
    ).padStart(2, "0")}`;
    growth.set(monthKey, (growth.get(monthKey) ?? 0) + 1);
  }

  return Array.from(growth.entries()).map(([month, count]) => ({ month, newUsers: count }));
}
