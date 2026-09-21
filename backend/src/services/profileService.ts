import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      location: true,
      createdAt: true,
      // nunca selecionamos "password" aqui - perfil é público
    },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const products = await prisma.product.findMany({
    where: { ownerId: userId, isAvailable: true },
    orderBy: { createdAt: "desc" },
  });

  const reviews = await prisma.review.findMany({
    where: { targetId: userId },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10, // só as 10 mais recentes, para não sobrecarregar
  });

  const ratingSummary = await prisma.review.aggregate({
    where: { targetId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    user,
    products,
    reviews,
    rating: {
      average: ratingSummary._avg.rating ?? 0,
      total: ratingSummary._count.rating,
    },
  };
}
