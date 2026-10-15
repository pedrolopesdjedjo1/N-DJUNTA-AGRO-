import { OrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";
import { createProduct } from "./productService";

const DAY = 86400000;
const FRESHNESS = ["FRESCO", "REFRIGERADO", "CONGELADO", "SALGADO", "SECO", "DEFUMADO"];
const UNITS = ["kg", "unidade", "caixa", "saco", "balde"];

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

function cleanList(value: any, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v).trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function stats(values: number[]) {
  if (values.length === 0) return { count: 0, avg: 0, min: 0, max: 0 };
  return {
    count: values.length,
    avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function isEquipment(details: any) {
  const tipo = details?.tipo;
  return tipo === "MATERIAL" || tipo === "FERRAMENTA";
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

  const [todayCatch, weekCatch, published, available, received, newOrders, salesCount, done, lowStock, stale, unread, weather, recent] =
    await Promise.all([
      prisma.fishCatch.aggregate({
        where: { userId, caughtAt: { gte: today } },
        _sum: { quantity: true, weightKg: true },
        _count: { _all: true },
      }),
      prisma.fishCatch.aggregate({
        where: { userId, caughtAt: { gte: new Date(now.getTime() - 7 * DAY) } },
        _sum: { weightKg: true },
        _count: { _all: true },
      }),
      prisma.product.count({ where: { ownerId: userId, department: "PESCA" } }),
      prisma.product.count({ where: { ownerId: userId, department: "PESCA", isAvailable: true } }),
      prisma.order.count({ where: { sellerId: userId, status: { not: OrderStatus.CANCELADO } } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.NOVO } }),
      prisma.order.count({ where: { sellerId: userId, status: OrderStatus.CONCLUIDO } }),
      prisma.order.findMany({
        where: { sellerId: userId, status: OrderStatus.CONCLUIDO, updatedAt: { gte: monthStart } },
        select: { total: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { ownerId: userId, department: "PESCA", isAvailable: true, quantity: { lte: 5 } },
        select: { id: true, title: true, quantity: true, unit: true },
        take: 5,
      }),
      prisma.order.count({
        where: {
          sellerId: userId,
          status: OrderStatus.NOVO,
          createdAt: { lt: new Date(now.getTime() - 1 * DAY) },
        },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.weatherAlert.findMany({ where: weatherWhere, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.fishCatch.findMany({ where: { userId }, orderBy: { caughtAt: "desc" }, take: 5 }),
    ]);

  return {
    today: {
      catches: todayCatch._count._all,
      quantity: todayCatch._sum.quantity ?? 0,
      weightKg: todayCatch._sum.weightKg ?? 0,
    },
    week: { catches: weekCatch._count._all, weightKg: weekCatch._sum.weightKg ?? 0 },
    published,
    available,
    ordersReceived: received,
    newOrders,
    salesCount,
    earningsToday: done.filter((o) => o.updatedAt >= today).reduce((s, o) => s + o.total, 0),
    earningsMonth: done.reduce((s, o) => s + o.total, 0),
    recentCatches: recent,
    alerts: {
      lowStock,
      staleOrders: stale,
      unreadNotifications: unread,
      weather,
    },
  };
}

// ---------- Minha pesca ----------
export async function listCatches(userId: string, filters: { status?: string; q?: string; days?: number }) {
  const where: any = { userId };
  if (filters.status === "available") where.isSold = false;
  if (filters.status === "sold") where.isSold = true;
  if (filters.q) where.species = { contains: filters.q, mode: "insensitive" };
  if (filters.days && filters.days > 0) {
    where.caughtAt = { gte: new Date(Date.now() - Math.min(filters.days, 365) * DAY) };
  }

  const items = await prisma.fishCatch.findMany({ where, orderBy: { caughtAt: "desc" }, take: 200 });

  return {
    count: items.length,
    totalWeightKg: items.reduce((s, c) => s + (c.weightKg ?? 0), 0),
    availableCount: items.filter((c) => !c.isSold && c.available > 0).length,
    items,
  };
}

export async function createCatch(userId: string, input: any) {
  const species = clean(input?.species, 60);
  if (!species) {
    throw new Error("Escreva o tipo de peixe.");
  }

  let quantity = Math.floor(Number(input?.quantity ?? 0));
  const hasWeight = input?.weightKg !== undefined && input.weightKg !== null && input.weightKg !== "";
  const weightKg = hasWeight ? Number(String(input.weightKg).replace(",", ".")) : null;

  if (isNaN(quantity) || quantity < 0) {
    throw new Error("Quantidade inválida.");
  }
  if (weightKg !== null && (isNaN(weightKg) || weightKg < 0 || weightKg > 100000)) {
    throw new Error("Peso inválido.");
  }

  let unit = clean(input?.unit, 20) ?? "kg";
  if (!UNITS.includes(unit)) unit = "kg";

  if (quantity === 0) {
    if (!weightKg) {
      throw new Error("Informe a quantidade ou o peso capturado.");
    }
    quantity = Math.max(1, Math.round(weightKg));
    unit = "kg";
  }

  const freshness = String(input?.freshness ?? "FRESCO");
  if (!FRESHNESS.includes(freshness)) {
    throw new Error("Estado do pescado inválido.");
  }

  const caughtAt = input?.caughtAt ? new Date(input.caughtAt) : new Date();
  if (isNaN(caughtAt.getTime()) || caughtAt.getTime() > Date.now() + 3600000) {
    throw new Error("Data e hora da pesca inválidas.");
  }

  const imageUrls = Array.isArray(input?.imageUrls) ? input.imageUrls.filter(validUrl).slice(0, 5) : [];

  return prisma.fishCatch.create({
    data: {
      userId,
      species,
      otherSpecies: cleanList(input?.otherSpecies, 10, 40),
      quantity,
      available: quantity,
      unit,
      weightKg,
      location: clean(input?.location, 150),
      caughtAt,
      imageUrls,
      freshness,
      notes: clean(input?.notes, 500),
    },
  });
}

async function syncProduct(userId: string, productId: string | null, available: number) {
  if (!productId) return;
  await prisma.product.updateMany({
    where: { id: productId, ownerId: userId },
    data: { quantity: available, isAvailable: available > 0 },
  });
}

export async function updateCatch(userId: string, id: string, input: any) {
  const found = await prisma.fishCatch.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Captura não encontrada.");
  }

  const data: any = {};

  if (input?.available !== undefined) {
    const available = Math.floor(Number(input.available));
    if (isNaN(available) || available < 0 || available > 1000000) {
      throw new Error("Quantidade inválida.");
    }
    data.available = available;
    data.isSold = available === 0;
  }
  if (input?.freshness !== undefined) {
    if (!FRESHNESS.includes(String(input.freshness))) {
      throw new Error("Estado do pescado inválido.");
    }
    data.freshness = String(input.freshness);
  }
  if (input?.notes !== undefined) data.notes = clean(input.notes, 500);
  if (input?.location !== undefined) data.location = clean(input.location, 150);

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.fishCatch.update({ where: { id }, data });
  if (data.available !== undefined) {
    await syncProduct(userId, found.productId, data.available);
  }
  return updated;
}

export async function markCatchSold(userId: string, id: string) {
  const found = await prisma.fishCatch.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Captura não encontrada.");
  }

  const updated = await prisma.fishCatch.update({ where: { id }, data: { available: 0, isSold: true } });
  await syncProduct(userId, found.productId, 0);
  return updated;
}

export async function deleteCatch(userId: string, id: string) {
  const found = await prisma.fishCatch.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Captura não encontrada.");
  }
  await prisma.fishCatch.delete({ where: { id } });
  return { id, deleted: true };
}

export async function publishCatch(userId: string, id: string, input: any) {
  const found = await prisma.fishCatch.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Captura não encontrada.");
  }
  if (found.isSold || found.available <= 0) {
    throw new Error("Esta captura já não tem quantidade disponível.");
  }

  if (found.productId) {
    const existing = await prisma.product.findUnique({ where: { id: found.productId } });
    if (existing) {
      throw new Error("Esta captura já foi publicada para venda.");
    }
  }

  const price = Number(String(input?.price ?? "").replace(",", "."));
  if (isNaN(price) || price <= 0) {
    throw new Error("Informe um preço válido.");
  }

  let unit = clean(input?.unit, 20) ?? found.unit;
  if (!UNITS.includes(unit)) unit = found.unit;

  const quantity = input?.quantity !== undefined ? Math.floor(Number(input.quantity)) : found.available;
  if (isNaN(quantity) || quantity < 1 || quantity > found.available) {
    throw new Error(`Escolha uma quantidade de 1 a ${found.available}.`);
  }

  const details: Record<string, string> = {
    tipo: "PRODUTO",
    estadoProduto: found.freshness,
    harvestDate: found.caughtAt.toISOString().slice(0, 10),
  };
  if (found.weightKg) details.weight = `${found.weightKg} kg`;

  const product = await createProduct({
    ownerId: userId,
    title: found.species,
    description: clean(input?.description, 500) ?? found.notes ?? undefined,
    category: "PESCA",
    department: "PESCA",
    subcategory: "Pescado",
    price,
    unit,
    quantity,
    location: found.location ?? undefined,
    imageUrl: found.imageUrls[0] ?? undefined,
    details,
  } as any);

  await prisma.fishCatch.update({ where: { id }, data: { productId: product.id } });
  return product;
}

// ---------- Preços do pescado ----------
export async function fishPrices(filters: { q?: string; region?: string }) {
  const where: any = { isAvailable: true, department: "PESCA" };
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };
  if (filters.region) where.location = { contains: filters.region, mode: "insensitive" };

  const products = await prisma.product.findMany({
    where,
    select: { title: true, unit: true, price: true, location: true, details: true },
  });

  const groups = new Map<string, { name: string; unit: string; prices: number[]; regions: Set<string> }>();
  products
    .filter((p) => !isEquipment(p.details))
    .forEach((p) => {
      const key = `${p.title.trim().toLowerCase()}|${p.unit.toLowerCase()}`;
      const group = groups.get(key) ?? { name: p.title.trim(), unit: p.unit, prices: [], regions: new Set<string>() };
      group.prices.push(p.price);
      if (p.location) group.regions.add(p.location.trim().toLowerCase());
      groups.set(key, group);
    });

  return Array.from(groups.values())
    .map((g) => ({ name: g.name, unit: g.unit, regions: g.regions.size, ...stats(g.prices) }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Perfil ----------
export async function getProfile(userId: string) {
  const [user, store, soldItems, sales, rating, memberships, catches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true },
    }),
    prisma.store.findUnique({ where: { ownerId: userId } }),
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
    prisma.fishCatch.findMany({ where: { userId }, orderBy: { caughtAt: "desc" }, take: 200 }),
  ]);

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const speciesCount = new Map<string, number>();
  catches.forEach((c) => speciesCount.set(c.species, (speciesCount.get(c.species) ?? 0) + 1));

  return {
    user,
    store,
    productsSold: soldItems._sum.quantity ?? 0,
    sales,
    rating: { average: rating._avg.rating ?? 0, count: rating._count._all },
    cooperatives: memberships.map((m) => m.cooperative),
    history: {
      catches: catches.length,
      totalWeightKg: catches.reduce((s, c) => s + (c.weightKg ?? 0), 0),
      topSpecies: Array.from(speciesCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([species, count]) => ({ species, count })),
      recent: catches.slice(0, 10),
    },
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
  if (input?.fisherType !== undefined) storeData.fisherType = clean(input.fisherType, 60);
  if (input?.boatType !== undefined) storeData.boatType = clean(input.boatType, 60);
  if (input?.boatRegistration !== undefined) storeData.boatRegistration = clean(input.boatRegistration, 40);
  if (input?.boatCapacity !== undefined) storeData.boatCapacity = clean(input.boatCapacity, 80);
  if (input?.description !== undefined) storeData.description = clean(input.description);
  if (Array.isArray(input?.equipment)) storeData.equipment = cleanList(input.equipment, 20, 40);
  if (Array.isArray(input?.mainSpecies)) storeData.mainSpecies = cleanList(input.mainSpecies, 20, 40);
  if (input?.logoUrl !== undefined) storeData.logoUrl = validUrl(input.logoUrl) ? input.logoUrl : null;

  await prisma.store.upsert({
    where: { ownerId: userId },
    update: storeData,
    create: { ownerId: userId, name: user.name, ...storeData },
  });

  return getProfile(userId);
}

// ---------- Cooperativas e comunidades de pesca ----------
export async function getCooperativeHub(userId: string, id: string) {
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

  const rawProducts = await prisma.product.findMany({
    where: { ownerId: { in: [coop.leaderId, ...memberIds] }, department: "PESCA", isAvailable: true },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { owner: { select: { id: true, name: true, phone: true } } },
  });
  const products = rawProducts.filter((p) => !isEquipment(p.details)).slice(0, 30);

  let news: any[] = [];
  let collectiveSale: any[] = [];
  let collectivePurchase: any[] = [];
  let equipment: any[] = [];

  if (joined) {
    const posts = await prisma.communityPost.findMany({
      where: { cooperativeId: id },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    const authors = await usersByIds(posts.map((p) => p.authorId));
    const withAuthor = posts.map((p) => ({ ...p, authorName: authors.get(p.authorId)?.name ?? "Membro" }));
    news = withAuthor.filter((p) => ["AVISO", "EVENTO", "CONHECIMENTO"].includes(p.kind));
    collectiveSale = withAuthor.filter((p) => p.kind === "VENDA_COLETIVA");
    collectivePurchase = withAuthor.filter((p) => p.kind === "COMPRA_COLETIVA");
    equipment = withAuthor.filter((p) => p.kind === "PARTILHA_EQUIPAMENTO");
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
    collectiveSale,
    collectivePurchase,
    equipment,
  };
}
