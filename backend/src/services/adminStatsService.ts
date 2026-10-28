import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { stageOf } from "../lib/agentOpsCatalog";
import { safe } from "../lib/agentScope";
import { ownerOf, readAll } from "../lib/anyModel";
import { BUYER_ROLES, ROLE_VALUES } from "../lib/adminUserCatalog";
import { STAT_SEGMENTS } from "../lib/adminContentCatalog";

const DAY = 86400000;
const NON_ADMIN = ROLE_VALUES.filter((r) => r !== "ADMIN");
const KIND_OF: Record<string, string> = {
  AGRICULTOR: "farmers",
  PESCADOR: "fishers",
  ARTESAO: "artisans",
  COMERCIANTE: "merchants",
  TRANSPORTADOR: "transporters",
  ONG: "ngos",
  GOVERNO: "institutions",
  AGENTE: "agents",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function r0(n: number) {
  return Math.round(n);
}

function parseDay(text: any, endOfDay = false): Date | null {
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text))) {
    throw new Error("Data inválida. Use o formato AAAA-MM-DD.");
  }
  const d = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  if (isNaN(d.getTime())) {
    throw new Error("Data inválida.");
  }
  return d;
}

function range(filters: { from?: string; to?: string }, defaultDays = 30) {
  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - (defaultDays - 1) * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }
  return { from, to, monthly: (to.getTime() - from.getTime()) / DAY > 62 };
}

function labels(from: Date, to: Date, monthly: boolean): string[] {
  const out: string[] = [];
  for (let t = startOfDay(from).getTime(); t <= to.getTime(); t += DAY) {
    const key = monthly ? monthKey(new Date(t)) : dayKey(new Date(t));
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

function regionName(location: any): string {
  return findRegion(location)?.name ?? "Região por confirmar";
}

function soldAmount(o: any) {
  return Number(o.total) || 0;
}

async function completedStatuses(): Promise<string[]> {
  const rows = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
  return rows.map((r) => String(r.status)).filter((s) => ["CONCLUIDA", "ENTREGUE"].includes(stageOf(s)));
}

// =====================================================================
// Visão geral do período
// =====================================================================
export async function statsOverview(filters: { from?: string; to?: string }) {
  const { from, to } = range(filters);
  const done = await completedStatuses();

  const [roleGroups, newUsers, verified, products, productsNew, byDepartment, orders, deliveryEvents, orgsNew, reportsOpened, reportsClosed] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { isActive: true }, _count: { _all: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { role: true }, take: 20000 }),
    prisma.user.count({ where: { isVerified: true, isActive: true } }),
    prisma.product.count({ where: { isAvailable: true } }),
    prisma.product.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.product.groupBy({ by: ["department"], where: { isAvailable: true }, _count: { _all: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { status: true, total: true }, take: 20000 }),
    prisma.deliveryEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: from, lte: to }, kind: { in: ["ENTREGUE", "PROBLEMA", "DESISTIU", "ACEITE"] } }, _count: { _all: true } }),
    prisma.user.count({ where: { role: { in: ["ONG", "GOVERNO"] as any }, createdAt: { gte: from, lte: to } } }),
    prisma.contentReport.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.contentReport.count({ where: { decidedAt: { gte: from, lte: to } } }),
  ]);

  const byKind: Record<string, number> = { farmers: 0, fishers: 0, artisans: 0, merchants: 0, transporters: 0, buyers: 0, ngos: 0, institutions: 0, agents: 0 };
  let active = 0;
  roleGroups.forEach((g) => {
    const role = String(g.role);
    if (role === "ADMIN") return;
    active += g._count._all;
    if (KIND_OF[role]) byKind[KIND_OF[role]] += g._count._all;
    else if (BUYER_ROLES.includes(role)) byKind.buyers += g._count._all;
  });

  const newByKind: Record<string, number> = { farmers: 0, fishers: 0, artisans: 0, merchants: 0, transporters: 0, buyers: 0, ngos: 0, institutions: 0, agents: 0 };
  newUsers.forEach((u) => {
    const role = String(u.role);
    if (KIND_OF[role]) newByKind[KIND_OF[role]] += 1;
    else if (BUYER_ROLES.includes(role)) newByKind.buyers += 1;
  });

  const stages: Record<string, number> = {};
  let sales = 0;
  let completed = 0;
  orders.forEach((o) => {
    const stage = stageOf(o.status);
    stages[stage] = (stages[stage] ?? 0) + 1;
    if (done.includes(String(o.status))) {
      sales += soldAmount(o);
      completed += 1;
    }
  });

  const ev: Record<string, number> = {};
  deliveryEvents.forEach((e) => (ev[e.kind] = e._count._all));

  return {
    from,
    to,
    users: { active, new: newUsers.length, verified, verifiedShare: active ? Math.round((verified / active) * 100) : 0, byKind, newByKind },
    market: {
      available: products,
      newInPeriod: productsNew,
      byDepartment: byDepartment.map((d) => ({ department: String(d.department ?? "OUTRO"), count: d._count._all })).sort((a, b) => b.count - a.count),
    },
    orders: {
      total: orders.length,
      completed,
      cancelled: stages.CANCELADA ?? 0,
      cancelRate: orders.length ? Math.round(((stages.CANCELADA ?? 0) / orders.length) * 100) : 0,
      sales: r0(sales),
      average: completed ? r0(sales / completed) : 0,
      byStage: stages,
    },
    transport: { accepted: ev.ACEITE ?? 0, delivered: ev.ENTREGUE ?? 0, problems: ev.PROBLEMA ?? 0, released: ev.DESISTIU ?? 0 },
    organizations: { newInPeriod: orgsNew },
    moderation: { reportsOpened, reportsClosed },
  };
}

// =====================================================================
// Crescimento da plataforma
// =====================================================================
export async function statsGrowth(filters: { from?: string; to?: string }) {
  const { from, to, monthly } = range(filters, 90);
  const done = await completedStatuses();

  const [baseUsers, users, products, orders, delivered] = await Promise.all([
    prisma.user.count({ where: { createdAt: { lt: from }, role: { in: NON_ADMIN as any } } }),
    prisma.user.findMany({ where: { createdAt: { gte: from, lte: to }, role: { in: NON_ADMIN as any } }, select: { createdAt: true }, take: 30000 }),
    prisma.product.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true }, take: 30000 }),
    prisma.order.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true, status: true, total: true }, take: 30000 }),
    prisma.deliveryEvent.findMany({ where: { kind: "ENTREGUE", createdAt: { gte: from, lte: to } }, select: { createdAt: true }, take: 30000 }),
  ]);

  const key = (d: any) => (monthly ? monthKey(new Date(d)) : dayKey(new Date(d)));
  const series = new Map(labels(from, to, monthly).map((label) => [label, { label, newUsers: 0, totalUsers: 0, products: 0, orders: 0, sales: 0, deliveries: 0 }]));

  users.forEach((u) => (series.get(key(u.createdAt)) ? (series.get(key(u.createdAt))!.newUsers += 1) : null));
  products.forEach((p) => (series.get(key(p.createdAt)) ? (series.get(key(p.createdAt))!.products += 1) : null));
  delivered.forEach((d) => (series.get(key(d.createdAt)) ? (series.get(key(d.createdAt))!.deliveries += 1) : null));
  orders.forEach((o) => {
    const s = series.get(key(o.createdAt));
    if (!s) return;
    s.orders += 1;
    if (done.includes(String(o.status))) s.sales += soldAmount(o);
  });

  let running = baseUsers;
  const items = Array.from(series.values()).map((s) => {
    running += s.newUsers;
    return { ...s, totalUsers: running, sales: r0(s.sales) };
  });

  const half = Math.floor(items.length / 2);
  const sum = (list: typeof items, k: "newUsers" | "orders" | "sales") => list.reduce((n, i) => n + i[k], 0);
  const growth = (k: "newUsers" | "orders" | "sales") => {
    const before = sum(items.slice(0, half), k);
    const after = sum(items.slice(half), k);
    return before > 0 ? Math.round(((after - before) / before) * 100) : null;
  };

  return {
    from,
    to,
    monthly,
    items,
    totals: { newUsers: sum(items, "newUsers"), orders: sum(items, "orders"), sales: sum(items, "sales"), usersNow: running },
    trend: { newUsers: growth("newUsers"), orders: growth("orders"), sales: growth("sales") },
    note: "A tendência compara a segunda metade do período com a primeira.",
  };
}

// =====================================================================
// Atividade por região
// =====================================================================
export async function statsRegions(filters: { from?: string; to?: string }) {
  const { from, to } = range(filters);
  const done = await completedStatuses();

  const [users, products, orders, delivered, reports] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true, role: { in: NON_ADMIN as any } }, select: { id: true, role: true, location: true, createdAt: true }, take: 60000 }),
    prisma.product.findMany({ where: { isAvailable: true }, select: { ownerId: true }, take: 60000 }),
    prisma.order.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { id: true, status: true, total: true, buyerId: true, sellerId: true }, take: 30000 }),
    prisma.deliveryEvent.findMany({ where: { kind: "ENTREGUE", createdAt: { gte: from, lte: to } }, select: { deliveryId: true }, take: 20000 }),
    prisma.contentReport.findMany({ where: { status: { in: ["ABERTA", "EM_ANALISE"] }, reportedUserId: { not: null } }, select: { reportedUserId: true }, take: 5000 }),
  ]);

  const locationOf = new Map(users.map((u) => [u.id, u.location]));
  const rows = new Map<string, any>();
  const row = (name: string) => {
    let r = rows.get(name);
    if (!r) {
      r = { region: name, users: 0, newUsers: 0, farmers: 0, fishers: 0, artisans: 0, merchants: 0, transporters: 0, buyers: 0, ngos: 0, institutions: 0, products: 0, orders: 0, sales: 0, deliveries: 0, openReports: 0 };
      rows.set(name, r);
    }
    return r;
  };
  REGIONS.forEach((r) => row(r.name));

  users.forEach((u) => {
    const r = row(regionName(u.location));
    r.users += 1;
    if (u.createdAt >= from && u.createdAt <= to) r.newUsers += 1;
    const role = String(u.role);
    if (KIND_OF[role] && KIND_OF[role] !== "agents") r[KIND_OF[role]] += 1;
    else if (BUYER_ROLES.includes(role)) r.buyers += 1;
  });
  products.forEach((p) => (row(regionName(locationOf.get(p.ownerId))).products += 1));
  orders.forEach((o) => {
    const r = row(regionName(locationOf.get(o.sellerId)));
    r.orders += 1;
    if (done.includes(String(o.status))) r.sales += soldAmount(o);
  });
  reports.forEach((x) => (row(regionName(locationOf.get(x.reportedUserId as string))).openReports += 1));

  // Entregas concluídas, pela região do comprador
  const deliveryIds = delivered.map((d) => d.deliveryId);
  if (deliveryIds.length > 0) {
    const deliveries: any[] = await prisma.delivery.findMany({ where: { id: { in: deliveryIds } }, select: { id: true, orderId: true }, take: 20000 });
    const orderRows: any[] = await prisma.order.findMany({ where: { id: { in: deliveries.map((d) => d.orderId).filter(Boolean) } }, select: { id: true, buyerId: true } });
    const buyerOf = new Map(orderRows.map((o) => [o.id, o.buyerId]));
    deliveries.forEach((d) => (row(regionName(locationOf.get(buyerOf.get(d.orderId)))).deliveries += 1));
  }

  const items = Array.from(rows.values())
    .map((r) => ({ ...r, sales: r0(r.sales) }))
    .sort((a, b) => b.users - a.users);

  return { from, to, items, unplaced: items.find((i) => i.region === "Região por confirmar")?.users ?? 0 };
}

// =====================================================================
// Um segmento (agricultores, pescadores, artesãos, ONGs, instituições...)
// =====================================================================
export async function statsSegment(kind: string, filters: { from?: string; to?: string }) {
  const def = STAT_SEGMENTS.find((s) => s.value === kind);
  if (!def) {
    throw new Error("Segmento inválido.");
  }
  const { from, to, monthly } = range(filters, 90);
  const done = await completedStatuses();

  const users = await prisma.user.findMany({
    where: { role: { in: def.roles as any } },
    select: { id: true, name: true, location: true, isVerified: true, isActive: true, createdAt: true },
    take: 20000,
  });
  const ids = users.map((u) => u.id);
  const activeUsers = users.filter((u) => u.isActive);

  const [orders, products, orgExtras] = await Promise.all([
    ids.length ? prisma.order.findMany({ where: { sellerId: { in: ids }, createdAt: { gte: from, lte: to } }, select: { id: true, sellerId: true, status: true, total: true } }) : Promise.resolve([] as any[]),
    ids.length ? prisma.product.findMany({ where: { ownerId: { in: ids }, isAvailable: true }, select: { ownerId: true, department: true }, take: 30000 }) : Promise.resolve([] as any[]),
    def.roles.some((r) => ["ONG", "GOVERNO"].includes(r))
      ? Promise.all([
          safe("organizações", async () => (await prisma.organization.findMany({ where: { ownerId: { in: ids } } })) as any[], [] as any[]),
          safe("projetos", async () => readAll(prisma.ngoProject as any, 3000), [] as any[]),
          safe("publicações", async () => readAll(prisma.publication as any, 3000), [] as any[]),
          safe("oportunidades", async () => readAll(prisma.opportunity as any, 3000), [] as any[]),
        ])
      : Promise.resolve(null),
  ]);

  const regions = new Map<string, number>();
  activeUsers.forEach((u) => regions.set(regionName(u.location), (regions.get(regionName(u.location)) ?? 0) + 1));

  const sellers = new Map<string, { id: string; name: string; sales: number; orders: number }>();
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  let sales = 0;
  let completed = 0;
  (orders as any[]).forEach((o) => {
    if (!done.includes(String(o.status))) return;
    sales += soldAmount(o);
    completed += 1;
    const s = sellers.get(o.sellerId) ?? { id: o.sellerId, name: nameOf.get(o.sellerId) ?? "Vendedor", sales: 0, orders: 0 };
    s.sales += soldAmount(o);
    s.orders += 1;
    sellers.set(o.sellerId, s);
  });

  const departments = new Map<string, number>();
  (products as any[]).forEach((p) => departments.set(String(p.department ?? "OUTRO"), (departments.get(String(p.department ?? "OUTRO")) ?? 0) + 1));

  const series = new Map(labels(from, to, monthly).map((l) => [l, { label: l, newAccounts: 0 }]));
  users.forEach((u) => {
    const s = series.get(monthly ? monthKey(u.createdAt) : dayKey(u.createdAt));
    if (s && u.createdAt >= from && u.createdAt <= to) s.newAccounts += 1;
  });

  let organizations: any = null;
  if (orgExtras) {
    const [orgs, projects, publications, opportunities] = orgExtras as any[][];
    const keys = new Set<string>([...ids, ...orgs.map((o) => o.id)]);
    const mine = (rows: any[]) => rows.filter((r) => keys.has(ownerOf(r))).length;
    organizations = { withProfile: orgs.length, verified: orgs.filter((o) => !!o.isVerified).length, projects: mine(projects), publications: mine(publications), opportunities: mine(opportunities) };
  }

  return {
    from,
    to,
    kind,
    label: def.label,
    totals: {
      accounts: users.length,
      active: activeUsers.length,
      new: users.filter((u) => u.createdAt >= from && u.createdAt <= to).length,
      verified: users.filter((u) => u.isVerified).length,
      verifiedShare: users.length ? Math.round((users.filter((u) => u.isVerified).length / users.length) * 100) : 0,
    },
    market: { productsAvailable: (products as any[]).length, byDepartment: Array.from(departments.entries()).map(([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count) },
    sales: { completed, amount: r0(sales), activeSellers: sellers.size, average: completed ? r0(sales / completed) : 0 },
    topSellers: Array.from(sellers.values()).sort((a, b) => b.sales - a.sales).slice(0, 5).map((s) => ({ ...s, sales: r0(s.sales) })),
    topRegions: Array.from(regions.entries()).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    series: Array.from(series.values()),
    monthly,
    organizations,
  };
}

// =====================================================================
// Relatório em texto, para partilhar
// =====================================================================
export async function statsReport(filters: { from?: string; to?: string }) {
  const [overview, growth, regions] = await Promise.all([statsOverview(filters), statsGrowth(filters), statsRegions(filters)]);
  const label = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const u = overview.users;
  const top = regions.items.filter((r) => r.region !== "Região por confirmar").slice(0, 5);
  const arrow = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n}%`);

  const lines = [
    "RELATÓRIO DA PLATAFORMA · NÔDJUNTA AGRO",
    `Período: ${label(overview.from)} a ${label(overview.to)}`,
    "",
    "UTILIZADORES",
    `- Contas ativas: ${u.active} (${u.verifiedShare}% verificadas)`,
    `- Contas novas no período: ${u.new}`,
    `- Agricultores ${u.byKind.farmers} · Pescadores ${u.byKind.fishers} · Artesãos ${u.byKind.artisans} · Comerciantes ${u.byKind.merchants}`,
    `- Transportadores ${u.byKind.transporters} · Clientes ${u.byKind.buyers} · ONGs ${u.byKind.ngos} · Instituições ${u.byKind.institutions}`,
    "",
    "MERCADO E VENDAS",
    `- Produtos à venda: ${overview.market.available} (${overview.market.newInPeriod} novos no período)`,
    `- Encomendas: ${overview.orders.total} (${overview.orders.completed} concluídas, ${overview.orders.cancelRate}% canceladas)`,
    `- Valor vendido: ${overview.orders.sales} FCFA (média ${overview.orders.average} FCFA)`,
    "",
    "TRANSPORTES",
    `- Entregas concluídas: ${overview.transport.delivered} · problemas comunicados: ${overview.transport.problems} · devolvidas: ${overview.transport.released}`,
    "",
    "CRESCIMENTO (segunda metade do período face à primeira)",
    `- Contas novas ${arrow(growth.trend.newUsers)} · encomendas ${arrow(growth.trend.orders)} · vendas ${arrow(growth.trend.sales)}`,
    "",
    "REGIÕES COM MAIS CONTAS",
    ...top.map((r) => `- ${r.region}: ${r.users} contas, ${r.products} produtos, ${r.sales} FCFA vendidos`),
    "",
    "MODERAÇÃO",
    `- Denúncias recebidas: ${overview.moderation.reportsOpened} · decididas: ${overview.moderation.reportsClosed}`,
  ];

  return { from: overview.from, to: overview.to, text: lines.join("\n") };
}
