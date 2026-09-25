import { prisma } from "../lib/prisma";
export async function addFavorite(userId: string, productId: string) {
  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    throw new Error("Este produto já está nos seus favoritos.");
  }

  return prisma.favorite.create({
    data: { userId, productId },
  });
}

export async function removeFavorite(userId: string, productId: string) {
  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (!existing) {
    throw new Error("Este produto não está nos seus favoritos.");
  }

  return prisma.favorite.delete({
    where: { userId_productId: { userId, productId } },
  });
}

export async function listMyFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          owner: { select: { id: true, name: true, role: true, location: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map((f) => f.product);
}
