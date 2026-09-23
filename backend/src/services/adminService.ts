import { prisma } from "../lib/prisma";

export async function getDashboardStats() {
  const [totalUsers, totalProducts, totalMessages, usersByRole] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.message.count(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  return { totalUsers, totalProducts, totalMessages, usersByRole };
}

export async function listAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      location: true,
      isActive: true,
      createdAt: true,
      // nunca selecionamos "password" aqui
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });
}

export async function listAllProducts() {
  return prisma.product.findMany({
    include: {
      owner: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function removeProduct(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  return prisma.product.delete({ where: { id: productId } });
}
