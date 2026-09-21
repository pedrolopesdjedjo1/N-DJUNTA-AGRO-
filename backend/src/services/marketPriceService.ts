import { PrismaClient, ProductCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Preço médio geral por categoria (em todas as regiões)
export async function getAveragePriceByCategory() {
  const results = await prisma.product.groupBy({
    by: ["category"],
    where: { isAvailable: true },
    _avg: { price: true },
    _min: { price: true },
    _max: { price: true },
    _count: { price: true },
  });

  return results.map((r) => ({
    category: r.category,
    averagePrice: r._avg.price ?? 0,
    minPrice: r._min.price ?? 0,
    maxPrice: r._max.price ?? 0,
    totalListings: r._count.price,
  }));
}

// Preço médio de uma categoria específica, comparando por região
export async function getAveragePriceByCategoryAndLocation(category: ProductCategory) {
  const products = await prisma.product.findMany({
    where: { category, isAvailable: true, location: { not: null } },
    select: { price: true, location: true },
  });

  const grouped = new Map<string, number[]>();

  for (const product of products) {
    const location = product.location as string;
    if (!grouped.has(location)) {
      grouped.set(location, []);
    }
    grouped.get(location)!.push(product.price);
  }

  return Array.from(grouped.entries()).map(([location, prices]) => ({
    location,
    averagePrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    totalListings: prices.length,
  }));
}
