import { OrderStatus } from "@prisma/client";
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

function totalsByUnit(products: { unit: string; quantity: number }[]) {
  const map = new Map<string, number>();
  products.forEach((p) => map.set(p.unit, (map.get(p.unit) ?? 0) + p.quantity));
  return Array.from(map.entries()).map(([unit, quantity]) => ({ unit, quantity }));
}

// ---------- Início ----------
export async function getDashboard(userId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { location: true } });

  const weatherWhere: any = { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] };
  if (user?.location) {
    weatherWhere.AND = [{ region: { contains: user.location, mode: "insensitive" } }];
  }

  const [published, available, received, newOrders, salesCount, done, lowStock, stale, unread, weather, stock] =
    await Promise.all([
      prisma.product.count({ where: { ownerId: userId } }),
      prisma.product.count({ where: { ownerId: userId, isAvailable: true } }),
      prisma.order.count({ where: { sellerId: userId, status: { not: OrderStatus.CANCELADO } } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.NOVO } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.CONCLUIDO } }),
      prisma.order.findMany({
        where: { sellerId: userId, status: OrderStatus.CONCLUIDO, updatedAt: { gte: monthStart } },
        select: { total: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { ownerId: userId, isAvailable: true, quantity: { lte: 5 } },
        select: { id: true, title: true, quantity: true, unit: true },
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
      prisma.weatherAlert.findMany({ where: weatherWhere, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.product.findMany({
        where: { ownerId: userId, isAvailable: true },
        select: { id: true, title: true, quantity: true, unit: true, details: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

  return {
    published,
    available,
    ordersReceived: received,
    newOrders,
    salesCount,
    earningsToday: done.filter((o) => o.updatedAt >= today).reduce((s, o) => s + o.total, 0),
    earningsMonth: done.reduce((s, o) => s + o.total, 0),
    production: {
      totals: totalsByUnit(stock),
      recent: stock.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        quantity: p.quantity,
        unit: p.unit,
        harvestDate: (p.details as any)?.harvestDate ?? null,
      })),
    },
    alerts: {
      lowStock,
      staleOrders: stale,
      unreadNotifications: unread,
      weather,
    },
  };
}

// ---------- Minha produção ----------
export async function getProduction(userId: string) {
  const products = await prisma.product.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      department: true,
      subcategory: true,
      quantity: true,
      unit: true,
      isAvailable: true,
      location: true,
      imageUrl: true,
      details: true,
      createdAt: true,
    },
  });

  return {
    count: products.length,
    available: products.filter((p) => p.isAvailable).length,
    totals: totalsByUnit(products.filter((p) => p.isAvailable)),
    items: products,
  };
}

export async function updateQuantity(userId: string, productId: string, quantity: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.ownerId !== userId) {
    throw new Error("Produto não encontrado.");
  }

  const value = Math.floor(Number(quantity));
  if (isNaN(value) || value < 0) {
    throw new Error("Quantidade inválida.");
  }

  return prisma.product.update({
    where: { id: productId },
    data: { quantity: value, isAvailable: value > 0 },
  });
}

export async function markSold(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.ownerId !== userId) {
    throw new Error("Produto não encontrado.");
  }
  return prisma.product.update({ where: { id: productId }, data: { quantity: 0, isAvailable: false } });
}

// ---------- Perfil ----------
export async function getProfile(userId: string) {
  const [user, store, published, soldItems, sales, rating, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true },
    }),
    prisma.store.findUnique({ where: { ownerId: userId } }),
    prisma.product.findMany({
      where: { ownerId: userId },
      select: { title: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
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
    producedProducts: Array.from(new Set(published.map((p) => p.title))).slice(0, 20),
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
  if (input?.farmType !== undefined) storeData.farmType = clean(input.farmType, 60);
  if (input?.cultivatedArea !== undefined) storeData.cultivatedArea = clean(input.cultivatedArea, 60);
  if (input?.description !== undefined) storeData.description = clean(input.description);
  if (Array.isArray(input?.mainCrops)) {
    storeData.mainCrops = input.mainCrops.map((c: any) => String(c).slice(0, 40)).slice(0, 15);
  }
  if (input?.logoUrl !== undefined) storeData.logoUrl = validUrl(input.logoUrl) ? input.logoUrl : null;

  await prisma.store.upsert({
    where: { ownerId: userId },
    update: storeData,
    create: { ownerId: userId, name: user.name, ...storeData },
  });

  return getProfile(userId);
}

// ---------- Cooperativas ----------
export async function listCooperatives(userId: string, near?: string) {
  const where: any = {};
  if (near) where.region = { contains: near, mode: "insensitive" };

  const coops = await prisma.cooperative.findMany({
    where,
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const mine = await prisma.cooperativeMember.findMany({ where: { userId }, select: { cooperativeId: true } });
  const joined = new Set(mine.map((m) => m.cooperativeId));
  const leaders = await usersByIds(coops.map((c) => c.leaderId));

  return coops.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    region: c.region,
    members: c._count.members,
    joined: joined.has(c.id) || c.leaderId === userId,
    leader: {
      id: c.leaderId,
      name: leaders.get(c.leaderId)?.name ?? "Líder",
      phone: leaders.get(c.leaderId)?.phone ?? null,
    },
  }));
}

export async function getCooperative(userId: string, id: string) {
  const coop = await prisma.cooperative.findUnique({ where: { id } });
  if (!coop) {
    throw new Error("Cooperativa não encontrada.");
  }

  const members = await prisma.cooperativeMember.findMany({
    where: { cooperativeId: id },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);
  const joined = coop.leaderId === userId || memberIds.includes(userId);
  const leaders = await usersByIds([coop.leaderId]);
  const leader = leaders.get(coop.leaderId);

  const products = await prisma.product.findMany({
    where: { ownerId: { in: [coop.leaderId, ...memberIds] }, isAvailable: true },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { owner: { select: { id: true, name: true, phone: true } } },
  });

  let news: any[] = [];
  let collective: any[] = [];
  if (joined) {
    const posts = await prisma.communityPost.findMany({
      where: { cooperativeId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const authors = await usersByIds(posts.map((p) => p.authorId));
    const withAuthor = posts.map((p) => ({ ...p, authorName: authors.get(p.authorId)?.name ?? "Membro" }));
    news = withAuthor.filter((p) => p.kind === "AVISO" || p.kind === "EVENTO" || p.kind === "CONHECIMENTO");
    collective = withAuthor.filter((p) => p.kind === "VENDA_COLETIVA" || p.kind === "COMPRA_COLETIVA");
  }

  return {
    cooperative: {
      id: coop.id,
      name: coop.name,
      description: coop.description,
      region: coop.region,
      createdAt: coop.createdAt,
    },
    leader: leader ? { id: leader.id, name: leader.name, phone: leader.phone } : null,
    members: memberIds.length,
    joined,
    products,
    news,
    collective,
  };
}
