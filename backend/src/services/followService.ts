import { prisma } from "../lib/prisma";

// Avisa quem guardou o vendedor nos favoritos (com avisos ligados) quando ele publica um produto novo
export async function notifyFollowers(sellerId: string, product: { id: string; title: string }) {
  const [followers, seller] = await Promise.all([
    prisma.favoriteSeller.findMany({
      where: { sellerId, notify: true },
      select: { userId: true },
      take: 500,
    }),
    prisma.user.findUnique({ where: { id: sellerId }, select: { name: true } }),
  ]);

  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.userId,
      type: "SISTEMA" as const,
      title: `Novidade de ${seller?.name ?? "um vendedor que segue"}`,
      message: `Publicou: ${product.title}`,
      relatedId: product.id,
    })),
  });
}
