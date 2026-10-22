import { prisma } from "../lib/prisma";
import { REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { assertGov } from "./organizationService";

const CACHE_MS = 10 * 60 * 1000;
const CACHE = new Map<string, { at: number; data: any }>();
const NONE = "NONE";
const OPEN_REPORT = ["RECEBIDO", "EM_ANALISE", "ENCAMINHADO"];
const KG: Record<string, number> = { kg: 1, tonelada: 1000, toneladas: 1000 };

const ROLE_FIELD: Record<string, string> = {
  AGRICULTOR: "farmers",
  PESCADOR: "fishers",
  ARTESAO: "artisans",
  COMERCIANTE: "merchants",
  TRANSPORTADOR: "transporters",
  COMPRADOR: "buyers",
  CLIENTE: "buyers",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthOf(value: Date | string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function round1(n: number): number {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function keyOf(text?: string | null): string {
  return findRegion(text)?.key ?? NONE;
}

function isEquipment(details: any): boolean {
  const tipo = details?.tipo;
  return tipo === "MATERIAL" || tipo === "FERRAMENTA";
}

function emptyRow(key: string, name: string, lat: number | null, lng: number | null) {
  return {
    key,
    name,
    lat,
    lng,
    users: 0,
    farmers: 0,
    fishers: 0,
    artisans: 0,
    merchants: 0,
    buyers: 0,
    transporters: 0,
    verified: 0,
    cooperatives: 0,
    cooperativeMembers: 0,
    projects: 0,
    projectsCompleted: 0,
    programs: 0,
    beneficiaries: 0,
    trainings: 0,
    catches: 0,
    catchKg: 0,
    productsAgri: 0,
    productsFish: 0,
    agriSoldKg: 0,
    fishSoldKg: 0,
    ordersCompleted: 0,
    ordersValue: 0,
    jobs: 0,
    trained: 0,
    productionKg: 0,
    reportsTotal: 0,
    reportsOpen: 0,
  } as Record<string, any>;
}

export async function getStats(role: string | undefined, filters: { region?: string; months?: number }) {
  assertGov(role);

  const months = Math.min(24, Math.max(3, Math.floor(filters.months ?? 12)));
  const sel = filters.region ?? "";
  if (sel && sel !== NONE && !REGIONS.some((r) => r.key === sel)) {
    throw new Error("Região inválida.");
  }

  const cacheKey = `${sel}|${months}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  const from = new Date(base.getFullYear(), base.getMonth() - (months - 1), 1);

  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    monthKeys.push(monthOf(new Date(base.getFullYear(), base.getMonth() - i, 1)));
  }
  const monthIndex = new Map(monthKeys.map((k, i) => [k, i]));
  const timeline = monthKeys.map((month) => ({ month, newUsers: 0, ordersCompleted: 0, ordersValue: 0, catchKg: 0 }));

  const rows = new Map<string, Record<string, any>>();
  REGIONS.forEach((r) => rows.set(r.key, emptyRow(r.key, r.name, r.lat, r.lng)));
  rows.set(NONE, emptyRow(NONE, "Sem região reconhecida", null, null));

  const inSel = (key: string) => !sel || key === sel;

  const [users, coops, products, items, orders, catches, projects, programs, reports, trainings, certificates] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true, location: true, isVerified: true, createdAt: true },
      take: 50000,
    }),
    prisma.cooperative.findMany({ select: { region: true, _count: { select: { members: true } } } }),
    prisma.product.findMany({
      where: { isAvailable: true, department: { in: ["AGRICULTURA", "PESCA"] } },
      select: { department: true, location: true, ownerId: true, details: true },
      take: 50000,
    }),
    prisma.orderItem.findMany({
      where: { order: { status: "CONCLUIDO", updatedAt: { gte: from } } },
      select: {
        quantity: true,
        title: true,
        product: { select: { department: true, unit: true, location: true, ownerId: true, details: true } },
      },
      take: 60000,
    }),
    prisma.order.findMany({
      where: { status: "CONCLUIDO", updatedAt: { gte: from } },
      select: { total: true, updatedAt: true, sellerId: true },
      take: 100000,
    }),
    prisma.fishCatch.findMany({
      where: { caughtAt: { gte: from } },
      select: { species: true, weightKg: true, location: true, userId: true, caughtAt: true },
      take: 50000,
    }),
    prisma.ngoProject.findMany({
      where: { isPublic: true },
      select: { id: true, region: true, lat: true, lng: true, status: true, area: true },
      take: 10000,
    }),
    prisma.govProgram.findMany({ where: { isPublic: true }, select: { regions: true, status: true } }),
    prisma.citizenReport.findMany({ select: { region: true, status: true, category: true }, take: 50000 }),
    prisma.training.findMany({
      where: { status: { not: "CANCELADA" } },
      select: { region: true, location: true, lat: true, lng: true },
      take: 10000,
    }),
    prisma.trainingEnrollment.count({ where: { status: "CONCLUIDO" } }),
  ]);

  const userKey = new Map<string, string>();
  users.forEach((u) => userKey.set(u.id, keyOf(u.location)));

  // Pessoas
  users.forEach((u) => {
    const key = userKey.get(u.id) as string;
    const field = ROLE_FIELD[String(u.role)];
    if (!field) return;

    const r = rows.get(key) as Record<string, any>;
    r[field] += 1;
    r.users += 1;
    if (u.isVerified) r.verified += 1;

    if (inSel(key)) {
      const i = monthIndex.get(monthOf(u.createdAt));
      if (i !== undefined) timeline[i].newUsers += 1;
    }
  });

  // Cooperativas
  coops.forEach((c) => {
    const r = rows.get(keyOf(c.region)) as Record<string, any>;
    r.cooperatives += 1;
    r.cooperativeMembers += c._count.members;
  });

  // Produtos à venda
  products.forEach((p) => {
    if (isEquipment(p.details)) return;
    const own = keyOf(p.location);
    const key = own !== NONE ? own : userKey.get(p.ownerId) ?? NONE;
    const r = rows.get(key) as Record<string, any>;
    if (p.department === "AGRICULTURA") r.productsAgri += 1;
    else r.productsFish += 1;
  });

  // Vendas concluídas (produção registada no mercado do app)
  const crops = new Map<string, { name: string; unit: string; quantity: number }>();
  const soldOther: Record<string, Record<string, number>> = { AGRICULTURA: {}, PESCA: {} };

  items.forEach((item) => {
    const p = item.product;
    if (!p || isEquipment(p.details)) return;
    if (p.department !== "AGRICULTURA" && p.department !== "PESCA") return;

    const own = keyOf(p.location);
    const key = own !== NONE ? own : userKey.get(p.ownerId) ?? NONE;
    const r = rows.get(key) as Record<string, any>;
    const unit = String(p.unit ?? "").trim().toLowerCase();
    const factor = KG[unit];

    if (factor) {
      if (p.department === "AGRICULTURA") r.agriSoldKg += item.quantity * factor;
      else r.fishSoldKg += item.quantity * factor;
    } else if (inSel(key)) {
      const bucket = soldOther[p.department];
      bucket[unit || "unidade"] = (bucket[unit || "unidade"] ?? 0) + item.quantity;
    }

    if (inSel(key) && p.department === "AGRICULTURA") {
      const cropKey = `${plain(item.title)}|${unit}`;
      const row = crops.get(cropKey) ?? { name: String(item.title).trim(), unit: unit || "unidade", quantity: 0 };
      row.quantity += item.quantity;
      crops.set(cropKey, row);
    }
  });

  // Encomendas concluídas
  orders.forEach((o) => {
    const key = userKey.get(o.sellerId) ?? NONE;
    const r = rows.get(key) as Record<string, any>;
    r.ordersCompleted += 1;
    r.ordersValue += o.total;

    if (inSel(key)) {
      const i = monthIndex.get(monthOf(o.updatedAt));
      if (i !== undefined) {
        timeline[i].ordersCompleted += 1;
        timeline[i].ordersValue += o.total;
      }
    }
  });

  // Pesca registada
  const species = new Map<string, { species: string; kg: number; catches: number }>();
  catches.forEach((c) => {
    const own = keyOf(c.location);
    const key = own !== NONE ? own : userKey.get(c.userId) ?? NONE;
    const r = rows.get(key) as Record<string, any>;
    const kg = c.weightKg ?? 0;
    r.catches += 1;
    r.catchKg += kg;

    if (inSel(key)) {
      const i = monthIndex.get(monthOf(c.caughtAt));
      if (i !== undefined) timeline[i].catchKg += kg;

      const sKey = plain(c.species);
      const row = species.get(sKey) ?? { species: c.species.trim(), kg: 0, catches: 0 };
      row.kg += kg;
      row.catches += 1;
      species.set(sKey, row);
    }
  });

  // Projetos públicos, beneficiários e resultados
  const projectInfo = new Map<string, { key: string; status: string; area: string }>();
  projects.forEach((p) => {
    const key =
      findRegion(p.region)?.key ?? (p.lat !== null && p.lng !== null ? nearestRegion(p.lat, p.lng)?.key ?? NONE : NONE);
    projectInfo.set(p.id, { key, status: p.status, area: p.area });

    const r = rows.get(key) as Record<string, any>;
    r.projects += 1;
    if (p.status === "CONCLUIDO") r.projectsCompleted += 1;
  });

  const projectIds = projects.map((p) => p.id);
  const [bens, results] = projectIds.length
    ? await Promise.all([
        prisma.ngoBeneficiary.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _count: { _all: true } }),
        prisma.ngoResult.findMany({ where: { projectId: { in: projectIds } }, select: { projectId: true, indicator: true, value: true } }),
      ])
    : [[], []];

  (bens as any[]).forEach((b) => {
    const info = b.projectId ? projectInfo.get(b.projectId) : null;
    if (info) (rows.get(info.key) as Record<string, any>).beneficiaries += b._count._all;
  });

  (results as any[]).forEach((res) => {
    const info = projectInfo.get(res.projectId);
    if (!info) return;
    const r = rows.get(info.key) as Record<string, any>;
    if (res.indicator === "EMPREGOS_CRIADOS") r.jobs += res.value;
    else if (res.indicator === "PESSOAS_FORMADAS") r.trained += res.value;
    else if (res.indicator === "PRODUCAO_KG") r.productionKg += res.value;
  });

  // Programas públicos (um programa conta em cada região onde atua)
  let programsTotal = 0;
  programs.forEach((p) => {
    const keys = Array.from(new Set(p.regions.map((name) => keyOf(name)).filter((k) => k !== NONE)));
    if (keys.length === 0) keys.push(NONE);
    if (!sel || keys.includes(sel)) programsTotal += 1;
    keys.forEach((k) => ((rows.get(k) as Record<string, any>).programs += 1));
  });

  // Pedidos e denúncias (só números, sem conteúdo)
  const reportCategories = new Map<string, number>();
  reports.forEach((rep) => {
    const key = keyOf(rep.region);
    const r = rows.get(key) as Record<string, any>;
    r.reportsTotal += 1;
    if (OPEN_REPORT.includes(rep.status)) r.reportsOpen += 1;
    if (inSel(key)) reportCategories.set(rep.category, (reportCategories.get(rep.category) ?? 0) + 1);
  });

  // Formações
  trainings.forEach((t) => {
    const key =
      findRegion(t.region)?.key ??
      findRegion(t.location)?.key ??
      (t.lat !== null && t.lng !== null ? nearestRegion(t.lat, t.lng)?.key ?? NONE : NONE);
    (rows.get(key) as Record<string, any>).trainings += 1;
  });

  // ---------- Totais ----------
  const selected = sel ? [rows.get(sel) as Record<string, any>] : Array.from(rows.values());
  const sum = (field: string) => selected.reduce((s, r) => s + (Number(r[field]) || 0), 0);

  const byStatus: Record<string, number> = {};
  const byArea: Record<string, number> = {};
  projectInfo.forEach((info) => {
    if (!inSel(info.key)) return;
    byStatus[info.status] = (byStatus[info.status] ?? 0) + 1;
    byArea[info.area] = (byArea[info.area] ?? 0) + 1;
  });

  const otherUnits = (dept: string) =>
    Object.entries(soldOther[dept])
      .map(([unit, quantity]) => ({ unit, quantity: round1(quantity) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

  const regionName = sel ? (rows.get(sel) as Record<string, any>).name : null;

  const data = {
    generatedAt: new Date().toISOString(),
    months,
    region: sel ? { key: sel, name: regionName } : null,
    people: {
      total: sum("users"),
      farmers: sum("farmers"),
      fishers: sum("fishers"),
      artisans: sum("artisans"),
      merchants: sum("merchants"),
      buyers: sum("buyers"),
      transporters: sum("transporters"),
      verified: sum("verified"),
    },
    cooperatives: { total: sum("cooperatives"), members: sum("cooperativeMembers") },
    production: {
      agriculture: {
        productsListed: sum("productsAgri"),
        soldKg: round1(sum("agriSoldKg")),
        soldOther: otherUnits("AGRICULTURA"),
        topCrops: Array.from(crops.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 8)
          .map((c) => ({ ...c, quantity: round1(c.quantity) })),
      },
      fishing: {
        productsListed: sum("productsFish"),
        catches: sum("catches"),
        catchKg: round1(sum("catchKg")),
        soldKg: round1(sum("fishSoldKg")),
        soldOther: otherUnits("PESCA"),
        topSpecies: Array.from(species.values())
          .sort((a, b) => b.kg - a.kg)
          .slice(0, 8)
          .map((s) => ({ ...s, kg: round1(s.kg) })),
      },
    },
    marketplace: { ordersCompleted: sum("ordersCompleted"), ordersValue: Math.round(sum("ordersValue")) },
    projects: {
      total: Object.values(byStatus).reduce((s, n) => s + n, 0),
      completed: byStatus.CONCLUIDO ?? 0,
      byStatus,
      byArea,
      programs: programsTotal,
    },
    impact: {
      beneficiaries: sum("beneficiaries"),
      jobs: Math.round(sum("jobs")),
      trained: Math.round(sum("trained")),
      productionKg: round1(sum("productionKg")),
      certificates: sel ? null : certificates,
      trainings: sum("trainings"),
    },
    reports: {
      total: sum("reportsTotal"),
      open: sum("reportsOpen"),
      byCategory: Array.from(reportCategories.entries()).map(([category, count]) => ({ category, count })),
    },
    byRegion: Array.from(rows.values())
      .filter((r) => r.key !== NONE || Object.values(r).some((v) => typeof v === "number" && v > 0 && v !== r.lat && v !== r.lng))
      .map((r) => ({
        ...r,
        catchKg: round1(r.catchKg),
        agriSoldKg: round1(r.agriSoldKg),
        fishSoldKg: round1(r.fishSoldKg),
        ordersValue: Math.round(r.ordersValue),
        jobs: Math.round(r.jobs),
        trained: Math.round(r.trained),
        productionKg: round1(r.productionKg),
      })),
    timeline: timeline.map((t) => ({ ...t, ordersValue: Math.round(t.ordersValue), catchKg: round1(t.catchKg) })),
    note:
      "Os números vêm do que as pessoas e as organizações registam no NÔDJUNTA AGRO. Não são o total nacional: mostram a atividade registada no app. As regiões vêm da localização escrita em cada perfil, produto ou projeto. Os dados dos projetos são só os projetos públicos.",
  };

  CACHE.set(cacheKey, { at: Date.now(), data });
  return data;
}
