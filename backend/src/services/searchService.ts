import { ProductCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface SearchFilters {
  query?: string;
  category?: ProductCategory;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "recent" | "price_asc" | "price_desc";
}

export async function searchProducts(filters: SearchFilters) {
  const orderBy =
    filters.sortBy === "price_asc"
      ? { price: "asc" as const }
      : filters.sortBy === "price_desc"
      ? { price: "desc" as const }
      : { createdAt: "desc" as const };

  return prisma.product.findMany({
    where: {
      isAvailable: true,
      category: filters.category,
      location: filters.location
        ? { contains: filters.location, mode: "insensitive" }
        : undefined,
      price: {
        gte: filters.minPrice,
        lte: filters.maxPrice,
      },
      OR: filters.query
        ? [
            { title: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      owner: {
        select: { id: true, name: true, role: true, location: true },
      },
    },
    orderBy,
  });
}
