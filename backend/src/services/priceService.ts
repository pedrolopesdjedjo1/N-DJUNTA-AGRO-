import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const DAY = 86400000;
const FARM_DEPARTMENTS = ["AGRICULTURA", "ALIMENTACAO"];

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
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

function departmentsOf(department?: string) {
  return department ? [department] : FARM_DEPARTMENTS;
}

interface Observation {
  name: string;
  price: number;
  date: Date;
}

// Preços vistos: anúncios publicados e vendas concluídas
async function observations(since: Date, opts: { q?: string; departments?: string[] } = {}) {
  const productWhere: Prisma.ProductWhereInput = { createdAt: { gte: since } };
  const itemWhere: Prisma.OrderItemWhereInput = {
    order: { status: OrderStatus.CONCLUIDO, updatedAt: { gte: since } },
  };

  if (opts.q) {
    productWhere.title = { contains: opts.q, mode: "insensitive" };
    itemWhere.title = { contains: opts.q, mode: "insensitive" };
  }
  if (opts.departments) {
    productWhere.department = { in: opts.departments };
    itemWhere.product = { department: { in: opts.departments } };
  }

  const [products, items] = await Promise.all([
    prisma.product.findMany({ where: productWhere, select: { title: true, price: true, createdAt: true } }),
    prisma.orderItem.findMany({
      where: itemWhere,
      select: { title: true, price: true, order: { select: { updatedAt: true } } },
    }),
  ]);

  const list: Observation[] = [
    ...products.map((p) => ({ name: normalizeName(p.title), price: p.price, date: p.createdAt })),
    ...items.map((i) => ({ name: normalizeName(i.title), price: i.price, date: i.order.updatedAt })),
  ];
  return list;
}

// ---------- Preços dos produtos ----------
export async function listPrices(filters: { q?: string; department?: string; region?: string }) {
  const where: Prisma.ProductWhereInput = {
    isAvailable: true,
    department: { in: departmentsOf(filters.department) },
  };
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };
  if (filters.region) where.location = { contains: filters.region, mode: "insensitive" };

  const products = await prisma.product.findMany({
    where,
    select: { title: true, unit: true, price: true, location: true },
  });

  const groups = new Map<string, { name: string; unit: string; prices: number[]; regions: Set<string> }>();
  products.forEach((p) => {
    const key = `${normalizeName(p.title)}|${p.unit.toLowerCase()}`;
    const group = groups.get(key) ?? { name: p.title.trim(), unit: p.unit, prices: [], regions: new Set<string>() };
    group.prices.push(p.price);
    if (p.location) group.regions.add(normalizeName(p.location));
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .map((g) => ({ name: g.name, unit: g.unit, regions: g.regions.size, ...stats(g.prices) }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Preços por região ----------
export async function pricesByRegion(q: string) {
  if (!q) {
    throw new Error("Escreva o nome do produto.");
  }

  const products = await prisma.product.findMany({
    where: { isAvailable: true, title: { contains: q, mode: "insensitive" } },
    select: { price: true, location: true },
  });

  const groups = new Map<string, { region: string; prices: number[] }>();
  products.forEach((p) => {
    const region = p.location?.trim() || "Sem região";
    const key = normalizeName(region);
    const group = groups.get(key) ?? { region, prices: [] };
    group.prices.push(p.price);
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .map((g) => ({ region: g.region, ...stats(g.prices) }))
    .sort((a, b) => a.avg - b.avg);
}

// ---------- Comparar preços ----------
export async function compareMarket(userId: string, q: string, region?: string) {
  if (!q) {
    throw new Error("Escreva o nome do produto.");
  }

  const where: Prisma.ProductWhereInput = { isAvailable: true, title: { contains: q, mode: "insensitive" } };
  if (region) where.location = { contains: region, mode: "insensitive" };

  const items = await prisma.product.findMany({
    where,
    select: { id: true, title: true, price: true, unit: true, location: true, ownerId: true },
    orderBy: { price: "asc" },
    take: 200,
  });

  return {
    market: stats(items.map((i) => i.price)),
    mine: stats(items.filter((i) => i.ownerId === userId).map((i) => i.price)),
    items: items.slice(0, 15),
  };
}

// ---------- Evolução dos preços ----------
export async function history(q: string, weeksInput?: number) {
  if (!q) {
    throw new Error("Escreva o nome do produto.");
  }

  const weeks = Math.min(26, Math.max(4, Math.floor(weeksInput ?? 12)));
  const now = Date.now();
  const obs = await observations(new Date(now - weeks * 7 * DAY), { q });

  const buckets: number[][] = Array.from({ length: weeks }, () => []);
  obs.forEach((o) => {
    const index = weeks - 1 - Math.floor((now - o.date.getTime()) / (7 * DAY));
    if (index >= 0 && index < weeks) buckets[index].push(o.price);
  });

  const points = buckets.map((list, index) => {
    const weeksAgo = weeks - 1 - index;
    return {
      weeksAgo,
      weekStart: new Date(now - (weeksAgo + 1) * 7 * DAY).toISOString().slice(0, 10),
      avg: list.length ? Math.round(list.reduce((s, v) => s + v, 0) / list.length) : null,
      count: list.length,
    };
  });

  const filled = points.filter((p) => p.avg !== null) as { avg: number }[];
  const change =
    filled.length >= 2 && filled[0].avg > 0
      ? Math.round(((filled[filled.length - 1].avg - filled[0].avg) / filled[0].avg) * 100)
      : null;

  return { q, points, change };
}

// ---------- Subidas e quedas ----------
export async function movers(department?: string) {
  const now = Date.now();
  const obs = await observations(new Date(now - 28 * DAY), { departments: departmentsOf(department) });

  const groups = new Map<string, { recent: number[]; previous: number[] }>();
  obs.forEach((o) => {
    const group = groups.get(o.name) ?? { recent: [], previous: [] };
    if (now - o.date.getTime() <= 14 * DAY) group.recent.push(o.price);
    else group.previous.push(o.price);
    groups.set(o.name, group);
  });

  const avg = (list: number[]) => list.reduce((s, v) => s + v, 0) / list.length;

  return Array.from(groups.entries())
    .filter(([, g]) => g.recent.length > 0 && g.previous.length > 0 && g.recent.length + g.previous.length >= 3)
    .map(([name, g]) => ({
      name,
      previous: Math.round(avg(g.previous)),
      recent: Math.round(avg(g.recent)),
      change: Math.round(((avg(g.recent) - avg(g.previous)) / avg(g.previous)) * 100),
    }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 10);
}

// ---------- Mais procurados ----------
export async function mostWanted(department?: string) {
  const since = new Date(Date.now() - 30 * DAY);
  const items = await prisma.orderItem.findMany({
    where: {
      order: { status: OrderStatus.CONCLUIDO, updatedAt: { gte: since } },
      product: { department: { in: departmentsOf(department) } },
    },
    select: { title: true, quantity: true },
  });

  const groups = new Map<string, { name: string; sold: number }>();
  items.forEach((i) => {
    const key = normalizeName(i.title);
    const group = groups.get(key) ?? { name: i.title.trim(), sold: 0 };
    group.sold += i.quantity;
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);
}

// ---------- Preços dos materiais ----------
export async function materialPrices(department = "AGRICULTURA") {
  const products = await prisma.product.findMany({
    where: {
      isAvailable: true,
      department,
      OR: [
        { details: { path: ["tipo"], equals: "MATERIAL" } },
        { details: { path: ["tipo"], equals: "FERRAMENTA" } },
      ],
    },
    select: { subcategory: true, price: true },
  });

  const groups = new Map<string, number[]>();
  products.forEach((p) => {
    const key = p.subcategory ?? "Outros";
    groups.set(key, [...(groups.get(key) ?? []), p.price]);
  });

  return Array.from(groups.entries())
    .map(([subcategory, prices]) => ({ subcategory, ...stats(prices) }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Alertas de preço ----------
export async function listAlerts(userId: string) {
  return prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function createAlert(userId: string, input: any) {
  const productName = typeof input?.productName === "string" ? input.productName.trim().slice(0, 80) : "";
  if (productName.length < 2) {
    throw new Error("Escreva o nome do produto.");
  }

  const direction = String(input.direction ?? "");
  if (direction !== "ACIMA" && direction !== "ABAIXO") {
    throw new Error("Escolha se quer ser avisado quando o preço subir ou descer.");
  }

  const targetPrice = Number(input.targetPrice);
  if (isNaN(targetPrice) || targetPrice <= 0) {
    throw new Error("Informe um preço válido.");
  }

  const active = await prisma.priceAlert.count({ where: { userId, isActive: true } });
  if (active >= 20) {
    throw new Error("Você já tem 20 alertas ativos. Apague algum para criar outro.");
  }

  const region = typeof input.region === "string" && input.region.trim() ? input.region.trim().slice(0, 60) : null;

  return prisma.priceAlert.create({
    data: { userId, productName, region, direction, targetPrice },
  });
}

export async function deleteAlert(userId: string, id: string) {
  const alert = await prisma.priceAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== userId) {
    throw new Error("Alerta não encontrado.");
  }
  await prisma.priceAlert.delete({ where: { id } });
  return { id, deleted: true };
}

export async function checkAlerts(userId: string) {
  const alerts = await prisma.priceAlert.findMany({ where: { userId, isActive: true } });
  const result: any[] = [];

  for (const alert of alerts) {
    const where: Prisma.ProductWhereInput = {
      isAvailable: true,
      title: { contains: alert.productName, mode: "insensitive" },
    };
    if (alert.region) where.location = { contains: alert.region, mode: "insensitive" };

    const products = await prisma.product.findMany({ where, select: { price: true } });
    const s = stats(products.map((p) => p.price));

    const met = s.count > 0 && (alert.direction === "ACIMA" ? s.avg >= alert.targetPrice : s.avg <= alert.targetPrice);
    const recently = alert.lastTriggeredAt && Date.now() - alert.lastTriggeredAt.getTime() < DAY;

    let notified = false;
    if (met && !recently) {
      await prisma.notification.create({
        data: {
          userId,
          type: "SISTEMA",
          title: "Alteração nos preços",
          message: `${alert.productName}: preço médio ${s.avg} FCFA (alerta: ${alert.direction === "ACIMA" ? "acima" : "abaixo"} de ${alert.targetPrice} FCFA).`,
          relatedId: alert.id,
        },
      });
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { lastTriggeredAt: new Date() } });
      notified = true;
    }

    result.push({ ...alert, currentAvg: s.count ? s.avg : null, samples: s.count, met, notified });
  }

  return result;
}
