import { prisma } from "../lib/prisma";

// Preço médio dos produtos disponíveis, por categoria (usado nas respostas por SMS)
export async function getAveragePriceByCategory(): Promise<{ category: string; averagePrice: number }[]> {
  const rows = await prisma.product.groupBy({
    by: ["category"],
    where: { isAvailable: true },
    _avg: { price: true },
  });

  return rows
    .filter((r) => r._avg.price !== null)
    .map((r) => ({ category: String(r.category), averagePrice: Number(r._avg.price) }));
}
