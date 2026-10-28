import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { clean, plain, safe } from "../lib/agentScope";
import { deliveryPhase } from "../lib/transportCatalog";
import { roleName } from "../lib/adminUserCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";
import { hydrate } from "./transportDeliveryService";
import { adminListTransporters, adminReviewTransporter } from "./transporterVerificationService";

const PAGE_SIZE = 25;
const DAY = 86400000;
const OPEN_REPORT = ["ABERTA", "EM_ANALISE"];

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

async function peopleOf(ids: (string | null | undefined)[]) {
  const list = Array.from(new Set(ids.filter(Boolean))) as string[];
  const users = list.length
    ? await prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, name: true, phone: true, role: true, location: true, isVerified: true, isActive: true } })
    : [];
  return new Map(users.map((u) => [u.id, { ...u, roleName: roleName(u.role) }]));
}

// Cartões das entregas vistos pela equipa: com nomes e contactos completos
async function adminCards(rows: any[]) {
  if (rows.length === 0) return [] as any[];

  const cards = await hydrate(rows, { userId: "", profile: null });
  const orderIds = Array.from(new Set(cards.map((c) => c.orderId).filter(Boolean))) as string[];
  const orders: any[] = orderIds.length ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, buyerId: true, sellerId: true, status: true } }) : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const people = await peopleOf([...orders.flatMap((o) => [o.buyerId, o.sellerId]), ...rows.map((r) => r.transporterId)]);

  const person = (id: any) => (id && people.get(id) ? people.get(id) : null);

  return cards.map((c) => {
    const o = orderMap.get(c.orderId);
    const row = rowMap.get(c.id);
    return { ...c, buyer: person(o?.buyerId), seller: person(o?.sellerId), transporter: person(row?.transporterId), orderStatus: o ? String(o.status) : null };
  });
}

async function eventsFor(ids: string[], kinds: string[], since: Date) {
  if (ids.length === 0) return [] as any[];
  return prisma.deliveryEvent.findMany({ where: { deliveryId: { in: ids }, kind: { in: kinds }, createdAt: { gte: since } } }) as Promise<any[]>;
}

// =====================================================================
// Visão geral
// =====================================================================
export async function transportOverview() {
  const now = Date.now();
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);

  const [deliveries, transporters, profiles, events, pairEvents] = await Promise.all([
    prisma.delivery.findMany({ select: { id: true, status: true, transporterId: true, createdAt: true, lastLocationAt: true }, orderBy: { createdAt: "desc" }, take: 20000 }) as Promise<any[]>,
    prisma.user.count({ where: { role: "TRANSPORTADOR", isActive: true } }),
    prisma.transporterProfile.findMany({ select: { isAvailable: true, verificationStatus: true } }),
    prisma.deliveryEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: d7 }, kind: { in: ["PROBLEMA", "DESISTIU", "ENTREGUE"] } }, _count: { _all: true } }),
    prisma.deliveryEvent.findMany({ where: { kind: { in: ["ACEITE", "ENTREGUE"] }, createdAt: { gte: d30 } }, select: { deliveryId: true, kind: true, createdAt: true }, take: 10000 }),
  ]);

  const phases: Record<string, number> = {};
  const active = new Set<string>();
  let awaitingOver24h = 0;
  let staleInTransit = 0;

  deliveries.forEach((d) => {
    const phase = deliveryPhase(d);
    phases[phase] = (phases[phase] ?? 0) + 1;
    if ((phase === "ACEITE" || phase === "EM_TRANSPORTE") && d.transporterId) active.add(d.transporterId);
    if (phase === "DISPONIVEL" && d.createdAt && now - new Date(d.createdAt).getTime() > DAY) awaitingOver24h += 1;
    if (phase === "EM_TRANSPORTE" && (!d.lastLocationAt || now - new Date(d.lastLocationAt).getTime() > 3600000)) staleInTransit += 1;
  });

  // Tempo médio entre aceitar e entregar
  const accepted = new Map<string, number>();
  const durations: number[] = [];
  pairEvents.filter((e) => e.kind === "ACEITE").forEach((e) => accepted.set(e.deliveryId, new Date(e.createdAt).getTime()));
  pairEvents.filter((e) => e.kind === "ENTREGUE").forEach((e) => {
    const start = accepted.get(e.deliveryId);
    if (start) durations.push((new Date(e.createdAt).getTime() - start) / 3600000);
  });

  const evMap: Record<string, number> = {};
  events.forEach((e) => (evMap[e.kind] = e._count._all));

  return {
    transporters: { total: transporters, available: profiles.filter((p) => p.isAvailable).length, verified: profiles.filter((p) => p.verificationStatus === "APROVADO").length, pending: profiles.filter((p) => p.verificationStatus === "PENDENTE").length, working: active.size },
    deliveries: {
      awaiting: phases.DISPONIVEL ?? 0,
      accepted: phases.ACEITE ?? 0,
      inTransit: phases.EM_TRANSPORTE ?? 0,
      delivered: phases.ENTREGUE ?? 0,
      cancelled: phases.CANCELADA ?? 0,
      awaitingOver24h,
      staleInTransit,
    },
    last7Days: { delivered: evMap.ENTREGUE ?? 0, problems: evMap.PROBLEMA ?? 0, released: evMap.DESISTIU ?? 0 },
    avgDeliveryHours: durations.length ? Math.round((durations.reduce((s, h) => s + h, 0) / durations.length) * 10) / 10 : null,
  };
}

// =====================================================================
// Transportadores
// =====================================================================
export async function listTransporters(filters: { q?: string; verification?: string; region?: string; available?: string; sort?: string; page?: number }) {
  const [users, profiles] = await Promise.all([
    prisma.user.findMany({ where: { role: "TRANSPORTADOR" }, select: { id: true, name: true, phone: true, location: true, photoUrl: true, isVerified: true, isActive: true, createdAt: true }, take: 1000 }),
    prisma.transporterProfile.findMany({ take: 1000 }),
  ]);
  const ids = users.map((u) => u.id);

  const [delivered, problems, released, active, reviews] = ids.length
    ? await Promise.all([
        prisma.deliveryEvent.groupBy({ by: ["actorId"], where: { actorId: { in: ids }, kind: "ENTREGUE" }, _count: { _all: true } }),
        prisma.deliveryEvent.groupBy({ by: ["actorId"], where: { actorId: { in: ids }, kind: "PROBLEMA" }, _count: { _all: true } }),
        prisma.deliveryEvent.groupBy({ by: ["actorId"], where: { actorId: { in: ids }, kind: "DESISTIU" }, _count: { _all: true } }),
        prisma.delivery.findMany({ where: { transporterId: { in: ids } }, select: { transporterId: true, status: true } }) as Promise<any[]>,
        safe("avaliações", async () => prisma.review.groupBy({ by: ["targetId"], where: { targetId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } }), [] as any[]),
      ])
    : [[], [], [], [], []];

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const count = (rows: any[], key: string) => new Map(rows.map((r) => [r[key], r._count._all]));
  const deliveredMap = count(delivered as any[], "actorId");
  const problemMap = count(problems as any[], "actorId");
  const releasedMap = count(released as any[], "actorId");
  const ratingMap = new Map((reviews as any[]).map((r) => [r.targetId, { average: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, count: r._count._all }]));
  const activeMap = new Map<string, number>();
  (active as any[]).forEach((d) => {
    if (["ACEITE", "EM_TRANSPORTE"].includes(deliveryPhase(d))) activeMap.set(d.transporterId, (activeMap.get(d.transporterId) ?? 0) + 1);
  });

  const region = filters.region ? REGIONS.find((r) => r.key === filters.region) : null;
  const needle = plain(filters.q);

  let items = users.map((u) => {
    const p = profileMap.get(u.id);
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      location: u.location,
      photoUrl: u.photoUrl,
      isVerified: u.isVerified,
      isActive: u.isActive,
      createdAt: u.createdAt,
      vehicleType: p?.vehicleType ?? null,
      plate: p?.plate ?? null,
      capacityKg: p?.capacityKg ?? null,
      regions: p?.regions ?? [],
      isAvailable: p?.isAvailable ?? false,
      verificationStatus: p?.verificationStatus ?? "RASCUNHO",
      delivered: deliveredMap.get(u.id) ?? 0,
      activeDeliveries: activeMap.get(u.id) ?? 0,
      problems: problemMap.get(u.id) ?? 0,
      released: releasedMap.get(u.id) ?? 0,
      rating: ratingMap.get(u.id) ?? { average: null, count: 0 },
    };
  });

  if (filters.verification) items = items.filter((i) => i.verificationStatus === filters.verification);
  if (filters.available === "yes") items = items.filter((i) => i.isAvailable && i.isActive);
  if (filters.available === "no") items = items.filter((i) => !i.isAvailable);
  if (region) items = items.filter((i) => i.regions.includes(region.key));
  if (needle) items = items.filter((i) => plain(`${i.name} ${i.phone} ${i.plate}`).includes(needle));

  if (filters.sort === "AVALIACAO") items.sort((a, b) => (b.rating.average ?? -1) - (a.rating.average ?? -1) || b.rating.count - a.rating.count);
  else if (filters.sort === "PROBLEMAS") items.sort((a, b) => b.problems + b.released - (a.problems + a.released));
  else if (filters.sort === "RECENTE") items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else items.sort((a, b) => b.delivered - a.delivered);

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return { total: items.length, page, pageSize: PAGE_SIZE, items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

// =====================================================================
// Entregas
// =====================================================================
export async function listDeliveries(filters: { phase?: string; transporterId?: string; q?: string; problems?: string; page?: number }) {
  const where: any = {};
  if (filters.transporterId) where.transporterId = filters.transporterId;

  const q = String(filters.q ?? "").replace(/^#/, "").trim();
  if (q) {
    if (/^[0-9a-zA-Z]{4,12}$/.test(q) && !/^\p{L}+$/u.test(q)) where.orderId = { endsWith: q.toLowerCase() };
    else {
      const people = await prisma.user.findMany({ where: { role: "TRANSPORTADOR", name: { contains: q, mode: "insensitive" } }, select: { id: true }, take: 100 });
      where.transporterId = { in: people.map((p) => p.id) };
    }
  }

  let rows: any[] = await prisma.delivery.findMany({ where, orderBy: { createdAt: "desc" }, take: 3000 });

  if (filters.problems === "true") {
    const events = await eventsFor(rows.map((r) => r.id), ["PROBLEMA", "DESISTIU"], new Date(Date.now() - 30 * DAY));
    const ids = new Set(events.map((e) => e.deliveryId));
    rows = rows.filter((r) => ids.has(r.id));
  }

  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const phase = deliveryPhase(r);
    counts[phase] = (counts[phase] ?? 0) + 1;
  });

  if (filters.phase) rows = rows.filter((r) => deliveryPhase(r) === filters.phase);

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { counts, total: rows.length, page, pageSize: PAGE_SIZE, items: await adminCards(slice) };
}

export async function getDelivery(id: string) {
  const row: any = await prisma.delivery.findUnique({ where: { id } });
  if (!row) {
    throw new Error("Entrega não encontrada.");
  }

  const [[card], events, transporter] = await Promise.all([
    adminCards([row]),
    prisma.deliveryEvent.findMany({ where: { deliveryId: id }, orderBy: { createdAt: "asc" }, take: 100 }),
    row.transporterId ? prisma.transporterProfile.findUnique({ where: { userId: row.transporterId } }) : Promise.resolve(null),
  ]);

  const authors = await peopleOf(events.map((e) => e.actorId));
  return {
    delivery: card,
    transporterProfile: transporter ? { vehicleType: transporter.vehicleType, plate: transporter.plate, capacityKg: transporter.capacityKg, verificationStatus: transporter.verificationStatus } : null,
    events: events.map((e) => ({ ...e, authorName: authors.get(e.actorId)?.name ?? "Utilizador", byTeam: authors.get(e.actorId)?.role === "ADMIN" })),
  };
}

// =====================================================================
// Rotas
// =====================================================================
export async function routesReport() {
  const rows: any[] = await prisma.delivery.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  const cards = await hydrate(rows, { userId: "", profile: null });

  const routes = new Map<string, { from: string; to: string; count: number; delivered: number; km: number[]; payout: number[] }>();
  const origins: Record<string, number> = {};
  const destinations: Record<string, number> = {};
  const unserved: Record<string, number> = {};

  cards.forEach((c) => {
    const from = c.pickup.regionName ?? "Região por confirmar";
    const to = c.destination.regionName ?? "Região por confirmar";
    const key = `${from}→${to}`;
    const r = routes.get(key) ?? { from, to, count: 0, delivered: 0, km: [], payout: [] };

    r.count += 1;
    if (c.phase === "ENTREGUE") r.delivered += 1;
    if (c.distanceKm !== null) r.km.push(c.distanceKm);
    if (c.payout) r.payout.push(c.payout);
    routes.set(key, r);

    origins[from] = (origins[from] ?? 0) + 1;
    destinations[to] = (destinations[to] ?? 0) + 1;
    if (c.phase === "DISPONIVEL") unserved[from] = (unserved[from] ?? 0) + 1;
  });

  const avg = (list: number[]) => (list.length ? Math.round((list.reduce((s, n) => s + n, 0) / list.length) * 10) / 10 : null);
  const top = (map: Record<string, number>) =>
    Object.keys(map)
      .map((name) => ({ name, count: map[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  return {
    sample: cards.length,
    routes: Array.from(routes.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((r) => ({ from: r.from, to: r.to, count: r.count, delivered: r.delivered, avgKm: avg(r.km), avgPayout: avg(r.payout) !== null ? Math.round(avg(r.payout) as number) : null })),
    origins: top(origins),
    destinations: top(destinations),
    unserved: top(unserved),
    note: "Baseado nas últimas 1000 entregas. As distâncias entre regiões são estimativas.",
  };
}

// =====================================================================
// Problemas de entrega
// =====================================================================
export async function listProblems(filters: { status?: string; page?: number }) {
  const since = new Date(Date.now() - 60 * DAY);
  const events: any[] = await prisma.deliveryEvent.findMany({ where: { kind: { in: ["PROBLEMA", "DESISTIU"] }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 500 });
  const deliveryIds = Array.from(new Set(events.map((e) => e.deliveryId)));

  const handled: any[] = deliveryIds.length ? await prisma.deliveryEvent.findMany({ where: { deliveryId: { in: deliveryIds }, kind: "TRATADO" } }) : [];
  const deliveries: any[] = deliveryIds.length ? await prisma.delivery.findMany({ where: { id: { in: deliveryIds } } }) : [];
  const deliveryMap = new Map(deliveries.map((d) => [d.id, d]));
  const people = await peopleOf(events.map((e) => e.actorId));

  const all = events.map((e) => {
    const isHandled = handled.some((h) => h.deliveryId === e.deliveryId && new Date(h.createdAt).getTime() >= new Date(e.createdAt).getTime());
    const d = deliveryMap.get(e.deliveryId);
    return {
      id: e.id,
      deliveryId: e.deliveryId,
      orderCode: shortId(d?.orderId),
      kind: e.kind,
      category: e.category,
      message: e.message,
      createdAt: e.createdAt,
      transporter: people.get(e.actorId) ? { id: e.actorId, name: people.get(e.actorId)!.name, phone: people.get(e.actorId)!.phone } : null,
      handled: isHandled,
    };
  });

  const counts = { open: all.filter((p) => !p.handled).length, handled: all.filter((p) => p.handled).length };
  const list = filters.status === "handled" ? all.filter((p) => p.handled) : filters.status === "all" ? all : all.filter((p) => !p.handled);
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return { counts, total: list.length, page, pageSize: PAGE_SIZE, items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

// Regista que um problema foi tratado e avisa quem for preciso
export async function handleProblem(admin: AdminSnapshot, deliveryId: string, input: any) {
  const d: any = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!d) {
    throw new Error("Entrega não encontrada.");
  }
  const message = clean(input?.message, 500);
  if (!message || message.length < 5) {
    throw new Error("Explique o que foi feito (pelo menos 5 letras).");
  }

  const order: any = d.orderId ? await prisma.order.findUnique({ where: { id: d.orderId } }) : null;
  const wanted: string[] = Array.isArray(input?.notify) ? input.notify.map(String) : [];
  const ids = [
    wanted.includes("TRANSPORTER") ? d.transporterId : null,
    wanted.includes("BUYER") ? order?.buyerId : null,
    wanted.includes("SELLER") ? order?.sellerId : null,
  ].filter(Boolean) as string[];

  await prisma.deliveryEvent.create({ data: { deliveryId, actorId: admin.userId, kind: "TRATADO", message } });
  if (ids.length > 0) {
    await prisma.notification.createMany({
      data: Array.from(new Set(ids)).map((userId) => ({ userId, type: "SISTEMA" as const, title: `Sobre a entrega ${shortId(d.orderId)}`, message: message.slice(0, 300), relatedId: deliveryId })),
    });
  }
  await logAudit(admin.userId, "DELIVERY_NOTE", { type: "DELIVERY", id: deliveryId }, `Tratou um problema da entrega ${shortId(d.orderId)}`);

  return getDelivery(deliveryId);
}

export async function warnTransporter(admin: AdminSnapshot, userId: string, messageInput: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
  if (!user || String(user.role) !== "TRANSPORTADOR") {
    throw new Error("Transportador não encontrado.");
  }
  const message = clean(messageInput, 300);
  if (!message || message.length < 5) {
    throw new Error("Escreva o aviso (pelo menos 5 letras).");
  }

  await prisma.notification.create({ data: { userId, type: "SISTEMA", title: "Aviso da equipa do NÔDJUNTA AGRO", message, relatedId: userId } });
  await logAudit(admin.userId, "DELIVERY_WARN", { type: "USER", id: userId }, `Avisou o transportador ${user.name}: ${message}`);
  return { userId, warned: true };
}

// =====================================================================
// Reclamações e avaliações
// =====================================================================
export async function listComplaints(filters: { status?: string; page?: number }) {
  const transporters = await prisma.user.findMany({ where: { role: "TRANSPORTADOR" }, select: { id: true }, take: 2000 });
  const base: any = { OR: [{ targetType: "DELIVERY" }, { reportedUserId: { in: transporters.map((t) => t.id) } }] };
  const where: any = filters.status === "ALL" ? base : { AND: [base, { status: { in: OPEN_REPORT } }] };

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.contentReport.count({ where }),
    prisma.contentReport.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const people = await peopleOf(rows.flatMap((r) => [r.reporterId, r.reportedUserId]));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      category: r.category,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
      reporter: people.get(r.reporterId) ? { id: r.reporterId, name: people.get(r.reporterId)!.name } : null,
      reported: r.reportedUserId && people.get(r.reportedUserId) ? { id: r.reportedUserId, name: people.get(r.reportedUserId)!.name } : null,
    })),
  };
}

export async function transportRatings() {
  const transporters = await prisma.user.findMany({ where: { role: "TRANSPORTADOR" }, select: { id: true, name: true }, take: 2000 });
  const names = new Map(transporters.map((t) => [t.id, t.name]));

  const reviews: any[] = await safe(
    "avaliações dos transportadores",
    async () => (await prisma.review.findMany({ where: { targetId: { in: transporters.map((t) => t.id) } }, orderBy: { createdAt: "desc" }, take: 2000 })) as any[],
    [] as any[]
  );

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const per = new Map<string, { sum: number; count: number }>();
  let sum = 0;

  reviews.forEach((r) => {
    const n = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
    distribution[n] += 1;
    sum += Number(r.rating) || 0;
    const p = per.get(r.targetId) ?? { sum: 0, count: 0 };
    p.sum += Number(r.rating) || 0;
    p.count += 1;
    per.set(r.targetId, p);
  });

  const ranked = Array.from(per.entries())
    .filter(([, p]) => p.count >= 3)
    .map(([id, p]) => ({ id, name: names.get(id) ?? "Transportador", average: Math.round((p.sum / p.count) * 10) / 10, count: p.count }));

  const authors = await peopleOf(reviews.filter((r) => Number(r.rating) <= 2).slice(0, 30).map((r) => r.authorId));

  return {
    average: reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : null,
    count: reviews.length,
    distribution,
    best: [...ranked].sort((a, b) => b.average - a.average || b.count - a.count).slice(0, 5),
    worst: [...ranked].sort((a, b) => a.average - b.average || b.count - a.count).slice(0, 5),
    low: reviews
      .filter((r) => Number(r.rating) <= 2)
      .slice(0, 30)
      .map((r) => ({
        id: r.id,
        rating: Number(r.rating) || 0,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        transporter: { id: r.targetId, name: names.get(r.targetId) ?? "Transportador" },
        authorName: authors.get(r.authorId)?.name ?? "Cliente",
      })),
  };
}

// =====================================================================
// Verificação de transportadores (usa o fluxo que já existe)
// =====================================================================
export function verificationList(filters: { status?: string; q?: string }) {
  return adminListTransporters("ADMIN", filters);
}

export async function verificationReview(admin: AdminSnapshot, userId: string, input: any) {
  const result = await adminReviewTransporter("ADMIN", admin.userId, userId, input);
  await logAudit(admin.userId, "TRANSPORTER_REVIEW", { type: "USER", id: userId }, `${input?.approve === true ? "Aprovou" : "Recusou"} a verificação de um transportador`);
  return result;
}
