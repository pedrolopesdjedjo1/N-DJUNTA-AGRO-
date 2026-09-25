import { prisma } from "../lib/prisma";

interface CreateReviewInput {
  authorId: string;
  targetId: string;
  productId?: string;
  rating: number;
  comment?: string;
}

export async function createReview(data: CreateReviewInput) {
  if (data.authorId === data.targetId) {
    throw new Error("Você não pode avaliar a si mesmo.");
  }

  if (data.rating < 1 || data.rating > 5) {
    throw new Error("A avaliação deve ser de 1 a 5 estrelas.");
  }

  return prisma.review.create({
    data: {
      authorId: data.authorId,
      targetId: data.targetId,
      productId: data.productId,
      rating: data.rating,
      comment: data.comment,
    },
  });
}

// Lista todas as avaliações recebidas por um usuário
export async function getReviewsForUser(targetId: string) {
  return prisma.review.findMany({
    where: { targetId },
    include: {
      author: { select: { id: true, name: true, role: true } },
      product: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Calcula a média de estrelas de um usuário
export async function getAverageRating(targetId: string) {
  const result = await prisma.review.aggregate({
    where: { targetId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    average: result._avg.rating ?? 0,
    total: result._count.rating,
  };
}
