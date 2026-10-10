import { Prisma, ProductCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface ProductInput {
  title?: string;
  description?: string;
  category?: ProductCategory;
  department?: string;
  subcategory?: string;
  price?: number;
  unit?: string;
  quantity?: number;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  isAvailable?: boolean;
  details?: Prisma.InputJsonValue;
}

export interface CreateProductInput extends ProductInput {
  ownerId: string;
  title: string;
  category: ProductCategory;
  price: number;
  unit: string;
  quantity: number;
}

export interface ProductFilters {
  q?: string;
  category?: ProductCategory;
  department?: string;
  subcategory?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  estado?: string;
  tipo?: string;
  minRating?: number;
  sort?: string;
  ownerId?: string;
  includeUnavailable?: boolean;
}

async function attachPromotions<T extends { id: string; price: number }>(products: T[]) {
  const ids = products.map((p) => p.id);
  const now = new Date();
  const promos = ids.length
    ? await prisma.promotion.findMany({
        where: {
          productId: { in: ids },
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      })
    : [];

  return products.map((p) => {
    const mine = promos
      .filter((x) => x.productId === p.id)
      .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    const best = mine[0] ?? null;
    const discount = best?.discountPercent ?? 0;
    return {
      ...p,
      promotion: best
        ? { kind: best.kind, title: best.title, discountPercent: best.discountPercent }
        : null,
      finalPrice: Math.round(p.price * (1 - discount / 100)),
    };
  });
}

export async function createProduct(data: CreateProductInput) {
  return prisma.product.create({ data });
}

export async function listProducts(filters: ProductFilters) {
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  if (!filters.includeUnavailable) where.isAvailable = true;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.category) where.category = filters.category;
  if (filters.department) where.department = filters.department;
  if (filters.subcategory) where.subcategory = filters.subcategory;
  if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = { gte: filters.minPrice, lte: filters.maxPrice };
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.estado) and.push({ details: { path: ["estado"], equals: filters.estado } });
  if (filters.tipo) and.push({ details: { path: ["tipo"], equals: filters.tipo } });
  if (and.length) where.AND = and;

  if (filters.minRating !== undefined) {
    const minRating = filters.minRating;
    const ratings = await prisma.review.groupBy({ by: ["targetId"], _avg: { rating: true } });
    const ownerIds = ratings
      .filter((r) => (r._avg.rating ?? 0) >= minRating)
      .map((r) => r.targetId);

    if (filters.ownerId) {
      where.ownerId = ownerIds.includes(filters.ownerId) ? filters.ownerId : "__nenhum__";
    } else {
      where.ownerId = { in: ownerIds };
    }
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (filters.sort === "price_asc") orderBy = { price: "asc" };
  if (filters.sort === "price_desc") orderBy = { price: "desc" };

  const products = await prisma.product.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, role: true, phone: true, isVerified: true } },
    },
    orderBy,
  });

  const result = await attachPromotions(products);

  if (filters.sort === "best_selling" && result.length > 0) {
    const sold = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: result.map((p) => p.id) } },
      _sum: { quantity: true },
    });
    const count = new Map<string, number>();
    sold.forEach((s) => {
      if (s.productId) count.set(s.productId, s._sum.quantity ?? 0);
    });
    result.sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
  }

  return result;
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, role: true, phone: true, location: true, isVerified: true },
      },
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const [withPromotion] = await attachPromotions([product]);
  return withPromotion;
}

export async function updateProduct(id: string, ownerId: string, data: ProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  if (product.ownerId !== ownerId) {
    throw new Error("Você não tem permissão para editar este produto.");
  }

  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: string, ownerId: string) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  if (product.ownerId !== ownerId) {
    throw new Error("Você não tem permissão para excluir este produto.");
  }

  return prisma.product.delete({ where: { id } });
}
