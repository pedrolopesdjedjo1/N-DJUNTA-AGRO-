import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const DAY = 86400000;

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

function clean(value: any, max = 500): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// ---------- Início ----------
export async function getDashboard(userId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [published, received, newOrders, inProduction, ready, soldItems, done, rating, lowStock, stale, unread, events] =
    await Promise.all([
      prisma.product.count({ where: { ownerId: userId } }),
      prisma.order.count({ where: { sellerId: userId, status: { not: OrderStatus.CANCELADO } } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.NOVO } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.EM_PREPARACAO } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.PRONTO } }),
      prisma.orderItem.aggregate({
        where: { order: { sellerId: userId, status: OrderStatus.CONCLUIDO } },
        _sum: { quantity: true },
      }),
      prisma.order.findMany({
        where: { sellerId: userId, status: OrderStatus.CONCLUIDO, updatedAt: { gte: monthStart } },
        select: { total: true, updatedAt: true },
      }),
      prisma.review.aggregate({
        where: { targetId: userId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.product.findMany({
        where: { ownerId: userId, isAvailable: true, quantity: { lte: 3 } },
        select: { id: true, title: true, quantity: true },
        take: 5,
      }),
      prisma.order.count({
        where: {
          sellerId: userId,
          status: OrderStatus.NOVO,
          createdAt: { lt: new Date(now.getTime() - 2 * DAY) },
        },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.eventRegistration.findMany({
        where: { userId, event: { startsAt: { gte: now } } },
        include: { event: { select: { id: true, title: true, startsAt: true, location: true } } },
        orderBy: { event: { startsAt: "asc" } },
        take: 3,
      }),
    ]);

  return {
    published,
    ordersReceived: received,
    newOrders,
    inProduction,
    ready,
    productsSold: soldItems._sum.quantity ?? 0,
    earningsToday: done.filter((o) => o.updatedAt >= today).reduce((s, o) => s + o.total, 0),
    earningsMonth: done.reduce((s, o) => s + o.total, 0),
    rating: { average: rating._avg.rating ?? 0, count: rating._count._all },
    alerts: {
      lowStock,
      staleOrders: stale,
      unreadNotifications: unread,
      upcomingEvents: events.map((e) => e.event),
    },
  };
}

// ---------- Marcar como vendido ----------
export async function markSold(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.ownerId !== userId) {
    throw new Error("Produto não encontrado.");
  }
  return prisma.product.update({ where: { id: productId }, data: { quantity: 0, isAvailable: false } });
}

// ---------- Mais vendidos ----------
export async function getBestSelling(userId: string) {
  const items = await prisma.orderItem.findMany({
    where: { order: { sellerId: userId, status: OrderStatus.CONCLUIDO } },
    select: { productId: true, title: true, price: true, quantity: true },
  });

  const map = new Map<string, { productId: string | null; title: string; quantity: number; revenue: number }>();
  items.forEach((i) => {
    const key = i.productId ?? i.title;
    const current = map.get(key) ?? { productId: i.productId, title: i.title, quantity: 0, revenue: 0 };
    current.quantity += i.quantity;
    current.revenue += i.price * i.quantity;
    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
}

// ---------- Histórico de pagamentos ----------
export async function getPayments(userId: string) {
  const orders = await prisma.order.findMany({
    where: { sellerId: userId, status: { not: OrderStatus.CANCELADO } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, buyerId: true, total: true, paid: true, status: true, createdAt: true, updatedAt: true },
  });

  const users = await usersByIds(orders.map((o) => o.buyerId));
  const rows = orders.map((o) => ({ ...o, buyerName: users.get(o.buyerId)?.name ?? "Cliente" }));
  const paid = rows.filter((o) => o.paid);
  const pending = rows.filter((o) => !o.paid);

  return {
    paid,
    pending,
    totalPaid: paid.reduce((s, o) => s + o.total, 0),
    totalPending: pending.reduce((s, o) => s + o.total, 0),
  };
}

// ---------- Avaliações ----------
export async function getReviews(userId: string) {
  const [received, given, agg] = await Promise.all([
    prisma.review.findMany({ where: { targetId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.review.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const users = await usersByIds([...received.map((r) => r.authorId), ...given.map((r) => r.targetId)]);

  return {
    average: agg._avg.rating ?? 0,
    count: agg._count._all,
    received: received.map((r) => ({ ...r, authorName: users.get(r.authorId)?.name ?? "Cliente" })),
    given: given.map((r) => ({ ...r, targetName: users.get(r.targetId)?.name ?? "Usuário" })),
  };
}

// ---------- Perfil ----------
export async function getProfile(userId: string) {
  const [user, store, crafts, soldItems, sales, rating, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true },
    }),
    prisma.store.findUnique({ where: { ownerId: userId } }),
    prisma.product.count({ where: { ownerId: userId, department: "ARTESANATO" } }),
    prisma.orderItem.aggregate({
      where: { order: { sellerId: userId, status: OrderStatus.CONCLUIDO } },
      _sum: { quantity: true },
    }),
    prisma.order.count({ where: { sellerId: userId, status: OrderStatus.CONCLUIDO } }),
    prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.cooperativeMember.findMany({
      where: { userId },
      include: { cooperative: { select: { id: true, name: true } } },
    }),
  ]);

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  return {
    user,
    store,
    crafts,
    productsSold: soldItems._sum.quantity ?? 0,
    sales,
    rating: { average: rating._avg.rating ?? 0, count: rating._count._all },
    cooperatives: memberships.map((m) => m.cooperative),
  };
}

export async function saveProfile(userId: string, input: any) {
  const name = clean(input?.name, 120);
  const location = clean(input?.location, 200);

  const userData: { name?: string; location?: string } = {};
  if (name) userData.name = name;
  if (location) userData.location = location;
  if (Object.keys(userData).length) {
    await prisma.user.update({ where: { id: userId }, data: userData });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const storeData: any = {};
  if (name) storeData.name = name;
  if (location) storeData.location = location;
  if (input?.craftType !== undefined) storeData.craftType = clean(input.craftType, 60);
  if (input?.description !== undefined) storeData.description = clean(input.description);
  if (Array.isArray(input?.specialties)) {
    storeData.specialties = input.specialties.map((s: any) => String(s).slice(0, 40)).slice(0, 12);
  }
  if (input?.logoUrl !== undefined) storeData.logoUrl = validUrl(input.logoUrl) ? input.logoUrl : null;

  await prisma.store.upsert({
    where: { ownerId: userId },
    update: storeData,
    create: { ownerId: userId, name: user.name, ...storeData },
  });

  return getProfile(userId);
}

// ---------- Mercado ----------
export async function getMarket() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since56 = new Date(now.getTime() - 56 * DAY);

  const crafts = await prisma.product.findMany({
    where: { department: "ARTESANATO" },
    select: { id: true, title: true, subcategory: true, price: true, isAvailable: true },
  });
  const ids = crafts.map((c) => c.id);
  const byId = new Map(crafts.map((c) => [c.id, c]));

  const items = ids.length
    ? await prisma.orderItem.findMany({
        where: {
          productId: { in: ids },
          order: { status: OrderStatus.CONCLUIDO, updatedAt: { gte: since56 } },
        },
        select: { productId: true, quantity: true, order: { select: { updatedAt: true } } },
      })
    : [];

  const sold30 = new Map<string, number>();
  const demand = new Map<string, number>();
  const weeks: number[] = new Array(8).fill(0);

  items.forEach((i) => {
    if (!i.productId) return;
    const when = i.order.updatedAt;
    const weeksAgo = Math.floor((now.getTime() - when.getTime()) / (7 * DAY));
    if (weeksAgo >= 0 && weeksAgo < 8) weeks[7 - weeksAgo] += i.quantity;
    if (when >= since30) {
      sold30.set(i.productId, (sold30.get(i.productId) ?? 0) + i.quantity);
      const sub = byId.get(i.productId)?.subcategory ?? "Outros";
      demand.set(sub, (demand.get(sub) ?? 0) + i.quantity);
    }
  });

  const mostWanted = Array.from(sold30.entries())
    .map(([id, sold]) => ({
      id,
      title: byId.get(id)?.title ?? "",
      subcategory: byId.get(id)?.subcategory ?? null,
      sold,
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 8);

  const supply = new Map<string, number>();
  const priceGroups = new Map<string, number[]>();
  crafts
    .filter((c) => c.isAvailable)
    .forEach((c) => {
      const sub = c.subcategory ?? "Outros";
      supply.set(sub, (supply.get(sub) ?? 0) + 1);
      priceGroups.set(sub, [...(priceGroups.get(sub) ?? []), c.price]);
    });

  const prices = Array.from(priceGroups.entries())
    .map(([subcategory, list]) => ({
      subcategory,
      count: list.length,
      avg: Math.round(list.reduce((s, p) => s + p, 0) / list.length),
      min: Math.min(...list),
      max: Math.max(...list),
    }))
    .sort((a, b) => b.count - a.count);

  const opportunities = Array.from(demand.entries())
    .map(([subcategory, units]) => ({ subcategory, demand: units, supply: supply.get(subcategory) ?? 0 }))
    .sort((a, b) => b.demand / (b.supply + 1) - a.demand / (a.supply + 1))
    .slice(0, 8);

  const promos = ids.length
    ? await prisma.promotion.findMany({
        where: {
          productId: { in: ids },
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  const featured = promos.map((p) => ({
    id: p.id,
    productId: p.productId,
    title: p.productId ? byId.get(p.productId)?.title ?? p.title : p.title,
    kind: p.kind,
    discountPercent: p.discountPercent,
  }));

  return {
    mostWanted,
    prices,
    trends: weeks.map((units, index) => ({ weeksAgo: 7 - index, units })),
    featured,
    opportunities,
  };
}

function stats(list: { price: number }[]) {
  if (list.length === 0) return { count: 0, avg: 0, min: 0, max: 0 };
  const values = list.map((i) => i.price);
  return {
    count: list.length,
    avg: Math.round(values.reduce((s, p) => s + p, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export async function compareMarket(userId: string, q?: string, subcategory?: string) {
  const where: Prisma.ProductWhereInput = { department: "ARTESANATO", isAvailable: true };
  if (subcategory) where.subcategory = subcategory;
  if (q) where.title = { contains: q, mode: "insensitive" };

  const items = await prisma.product.findMany({
    where,
    select: { id: true, title: true, price: true, ownerId: true, subcategory: true },
    orderBy: { price: "asc" },
    take: 100,
  });

  return {
    market: stats(items),
    mine: stats(items.filter((i) => i.ownerId === userId)),
    items: items.slice(0, 20),
  };
}
