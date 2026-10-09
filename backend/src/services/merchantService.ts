import { OrderStatus, PromotionKind } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const IN_PROGRESS = [OrderStatus.ACEITO, OrderStatus.EM_PREPARACAO, OrderStatus.ENVIADO];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function validUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

function clean(value: any): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
}

// ---------- Início ----------
export async function getDashboard(userId: string) {
  const [published, available, newOrders, inProgress, earnings, buyers, rating, lowStock, unread] =
    await Promise.all([
      prisma.product.count({ where: { ownerId: userId } }),
      prisma.product.count({ where: { ownerId: userId, isAvailable: true } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.NOVO } }),
      prisma.order.count({ where: { sellerId: userId, status: { in: IN_PROGRESS } } }),
      prisma.order.aggregate({
        where: { sellerId: userId, status: OrderStatus.CONCLUIDO },
        _sum: { total: true },
      }),
      prisma.order.groupBy({ by: ["buyerId"], where: { sellerId: userId } }),
      prisma.review.aggregate({
        where: { targetId: userId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.product.findMany({
        where: { ownerId: userId, isAvailable: true, quantity: { lte: 5 } },
        select: { id: true, title: true, quantity: true },
        take: 5,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

  return {
    published,
    available,
    newOrders,
    inProgress,
    earnings: earnings._sum.total ?? 0,
    customers: buyers.length,
    rating: { average: rating._avg.rating ?? 0, count: rating._count._all },
    alerts: { lowStock, unreadNotifications: unread },
  };
}

// ---------- Perfil da loja ----------
export async function getMyStore(ownerId: string) {
  return prisma.store.findUnique({ where: { ownerId } });
}

export async function saveStore(ownerId: string, input: any) {
  const name = clean(input?.name);
  if (!name) {
    throw new Error("Informe o nome da loja.");
  }

  const data = {
    name,
    logoUrl: validUrl(input.logoUrl) ? input.logoUrl : null,
    photoUrls: (Array.isArray(input.photoUrls) ? input.photoUrls : []).filter(validUrl).slice(0, 6),
    description: clean(input.description),
    contact: clean(input.contact),
    location: clean(input.location),
    openingHours: clean(input.openingHours),
    categories: (Array.isArray(input.categories) ? input.categories : [])
      .map((c: any) => String(c).slice(0, 40))
      .slice(0, 12),
  };

  return prisma.store.upsert({
    where: { ownerId },
    update: data,
    create: { ownerId, ...data },
  });
}

export async function getPublicStore(ownerId: string) {
  const [store, users, products, rating] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId } }),
    usersByIds([ownerId]),
    prisma.product.count({ where: { ownerId, isAvailable: true } }),
    prisma.review.aggregate({ where: { targetId: ownerId }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const owner = users.get(ownerId);
  if (!store && !owner) {
    throw new Error("Loja não encontrada.");
  }

  return {
    store,
    owner: owner ?? null,
    products,
    rating: { average: rating._avg.rating ?? 0, count: rating._count._all },
  };
}

// ---------- Vendas e ganhos ----------
export async function getSales(userId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfDay(new Date(now.getTime() - 6 * 86400000));
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirty = startOfDay(new Date(now.getTime() - 29 * 86400000));

  const completed = await prisma.order.findMany({
    where: { sellerId: userId, status: OrderStatus.CONCLUIDO },
    select: { total: true, paid: true, updatedAt: true },
  });

  const sumFrom = (from: Date) =>
    completed.filter((o) => o.updatedAt >= from).reduce((s, o) => s + o.total, 0);

  const pending = await prisma.order.aggregate({
    where: { sellerId: userId, paid: false, status: { not: OrderStatus.CANCELADO } },
    _sum: { total: true },
  });

  const historyRaw = await prisma.order.findMany({
    where: { sellerId: userId, status: { not: OrderStatus.NOVO } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, buyerId: true, total: true, status: true, paid: true, createdAt: true },
  });
  const users = await usersByIds(historyRaw.map((o) => o.buyerId));
  const history = historyRaw.map((o) => ({ ...o, buyerName: users.get(o.buyerId)?.name ?? "Cliente" }));

  const byDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    byDay.set(new Date(thirty.getTime() + i * 86400000).toISOString().slice(0, 10), 0);
  }
  completed
    .filter((o) => o.updatedAt >= thirty)
    .forEach((o) => {
      const key = o.updatedAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + o.total);
    });

  return {
    today: sumFrom(today),
    week: sumFrom(week),
    month: sumFrom(month),
    totalReceived: completed.filter((o) => o.paid).reduce((s, o) => s + o.total, 0),
    pendingPayments: pending._sum.total ?? 0,
    history,
    report: Array.from(byDay.entries()).map(([date, total]) => ({ date, total })),
  };
}

// ---------- Clientes ----------
export async function listCustomers(userId: string) {
  const groups = await prisma.order.groupBy({
    by: ["buyerId"],
    where: { sellerId: userId, status: { not: OrderStatus.CANCELADO } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
  });

  const users = await usersByIds(groups.map((g) => g.buyerId));
  const favorites = await prisma.favoriteCustomer.findMany({
    where: { ownerId: userId },
    select: { customerId: true },
  });
  const favoriteIds = new Set(favorites.map((f) => f.customerId));

  return groups
    .map((g) => ({
      id: g.buyerId,
      name: users.get(g.buyerId)?.name ?? "Cliente",
      phone: users.get(g.buyerId)?.phone ?? null,
      location: users.get(g.buyerId)?.location ?? null,
      orders: g._count._all,
      totalSpent: g._sum.total ?? 0,
      lastOrderAt: g._max.createdAt,
      isFavorite: favoriteIds.has(g.buyerId),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export async function getCustomerHistory(userId: string, customerId: string) {
  return prisma.order.findMany({
    where: { sellerId: userId, buyerId: customerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleFavoriteCustomer(userId: string, customerId: string) {
  const existing = await prisma.favoriteCustomer.findFirst({
    where: { ownerId: userId, customerId },
  });

  if (existing) {
    await prisma.favoriteCustomer.delete({ where: { id: existing.id } });
    return { isFavorite: false };
  }

  await prisma.favoriteCustomer.create({ data: { ownerId: userId, customerId } });
  return { isFavorite: true };
}

// ---------- Promoções ----------
export async function listPromotions(userId: string) {
  const promotions = await prisma.promotion.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  const ids = promotions.map((p) => p.productId).filter((id): id is string => !!id);
  const products = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
    : [];
  const titles = new Map(products.map((p) => [p.id, p.title]));

  return promotions.map((p) => ({
    ...p,
    productTitle: p.productId ? titles.get(p.productId) ?? null : null,
  }));
}

export async function createPromotion(userId: string, input: any) {
  const title = clean(input?.title);
  if (!title) {
    throw new Error("Informe o título da promoção.");
  }

  const kind = String(input.kind ?? "DESCONTO");
  if (!(Object.values(PromotionKind) as string[]).includes(kind)) {
    throw new Error("Tipo de promoção inválido.");
  }

  let discountPercent: number | null = null;
  if (input.discountPercent !== undefined && input.discountPercent !== null && input.discountPercent !== "") {
    discountPercent = Number(input.discountPercent);
    if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 90) {
      throw new Error("O desconto deve ficar entre 1 e 90 por cento.");
    }
  }

  let productId: string | null = null;
  if (input.productId) {
    const product = await prisma.product.findUnique({ where: { id: String(input.productId) } });
    if (!product || product.ownerId !== userId) {
      throw new Error("Produto não encontrado.");
    }
    productId = product.id;
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (isNaN(startsAt.getTime()) || (endsAt && isNaN(endsAt.getTime()))) {
    throw new Error("Data inválida.");
  }
  if (endsAt && endsAt < startsAt) {
    throw new Error("A data final deve ser depois da inicial.");
  }

  return prisma.promotion.create({
    data: {
      ownerId: userId,
      productId,
      kind: kind as PromotionKind,
      title,
      description: clean(input.description),
      discountPercent,
      startsAt,
      endsAt,
    },
  });
}

export async function removePromotion(userId: string, id: string) {
  const promotion = await prisma.promotion.findUnique({ where: { id } });
  if (!promotion || promotion.ownerId !== userId) {
    throw new Error("Promoção não encontrada.");
  }
  await prisma.promotion.delete({ where: { id } });
  return { id, deleted: true };
}
