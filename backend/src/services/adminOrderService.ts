import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { stageOf } from "../lib/agentOpsCatalog";
import { clean } from "../lib/agentScope";
import { getSetting } from "../lib/platformSettings";
import { roleName } from "../lib/adminUserCatalog";
import { STAGE_GROUPS } from "../lib/adminOpsCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const DAY = 86400000;
const FINAL = ["CONCLUIDA", "CANCELADA", "ENTREGUE"];
const OPEN_REPORT = ["ABERTA", "EM_ANALISE"];
const OPEN_DISPUTE = ["ABERTA", "EM_ANALISE"];

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
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

// Os estados guardados na base de dados que pertencem a cada grupo
let groupCache: { at: number; byGroup: Record<string, string[]> } | null = null;

async function statusGroups(): Promise<Record<string, string[]>> {
  if (groupCache && Date.now() - groupCache.at < 60000) return groupCache.byGroup;

  const rows = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
  const byGroup: Record<string, string[]> = { PENDING: [], IN_PROGRESS: [], COMPLETED: [], CANCELLED: [] };

  rows.forEach((r) => {
    const stage = stageOf(r.status);
    Object.keys(STAGE_GROUPS).forEach((g) => {
      if (STAGE_GROUPS[g].includes(stage)) byGroup[g].push(String(r.status));
    });
  });

  groupCache = { at: Date.now(), byGroup };
  return byGroup;
}

// Encomendas com problemas e o motivo de cada uma
let problemCache: { at: number; map: Map<string, string[]> } | null = null;

export async function problemMap(): Promise<Map<string, string[]>> {
  if (problemCache && Date.now() - problemCache.at < 120000) return problemCache.map;

  const stuckDays = await getSetting<number>("delivery.stuckDays");
  const now = Date.now();

  const [stale, disputes, reports, problemEvents, agentCases, payments] = await Promise.all([
    prisma.order.findMany({ where: { updatedAt: { lt: new Date(now - stuckDays * DAY) } }, select: { id: true, status: true }, take: 5000 }),
    prisma.orderDispute.findMany({ where: { status: { in: OPEN_DISPUTE } }, select: { orderId: true } }),
    prisma.contentReport.findMany({ where: { targetType: "ORDER", status: { in: OPEN_REPORT }, targetId: { not: null } }, select: { targetId: true } }),
    prisma.deliveryEvent.findMany({ where: { kind: "PROBLEMA", createdAt: { gte: new Date(now - 14 * DAY) } }, select: { deliveryId: true } }),
    prisma.agentCase.findMany({ where: { status: { not: "RESOLVIDO" }, orderId: { not: null } }, select: { orderId: true } }),
    prisma.orderPayment.findMany({ where: { createdAt: { lt: new Date(now - 3 * DAY) } }, select: { orderId: true, status: true }, take: 5000 }),
  ]);

  const deliveryIds = Array.from(new Set(problemEvents.map((e) => e.deliveryId)));
  const deliveries: any[] = deliveryIds.length ? await prisma.delivery.findMany({ where: { id: { in: deliveryIds } }, select: { orderId: true } }) : [];

  const latePay = (payments as any[]).filter((p) => String(p.status).toUpperCase().includes("PEND")).map((p) => p.orderId as string);
  const lateOrders: any[] = latePay.length ? await prisma.order.findMany({ where: { id: { in: Array.from(new Set(latePay)) } }, select: { id: true, status: true } }) : [];

  const map = new Map<string, string[]>();
  const add = (orderId: any, reason: string) => {
    if (!orderId) return;
    const list = map.get(String(orderId)) ?? [];
    if (!list.includes(reason)) map.set(String(orderId), [...list, reason]);
  };

  stale.filter((o) => !FINAL.includes(stageOf(o.status))).forEach((o) => add(o.id, "STUCK"));
  disputes.forEach((d) => add(d.orderId, "DISPUTE"));
  reports.forEach((r) => add(r.targetId, "REPORTED"));
  deliveries.forEach((d) => add(d.orderId, "DELIVERY_PROBLEM"));
  (agentCases as any[]).forEach((c) => add(c.orderId, "AGENT_CASE"));
  lateOrders.filter((o) => !FINAL.includes(stageOf(o.status))).forEach((o) => add(o.id, "PAYMENT_LATE"));

  problemCache = { at: Date.now(), map };
  return map;
}

async function peopleOf(ids: (string | null | undefined)[]) {
  const list = Array.from(new Set(ids.filter(Boolean))) as string[];
  const users = list.length
    ? await prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, name: true, phone: true, role: true, location: true, isVerified: true, isActive: true } })
    : [];
  return new Map(users.map((u) => [u.id, { ...u, roleName: roleName(u.role) }]));
}

// =====================================================================
// Lista de encomendas
// =====================================================================
export async function listOrders(filters: {
  group?: string;
  q?: string;
  buyerId?: string;
  sellerId?: string;
  region?: string;
  from?: string;
  to?: string;
  minTotal?: number;
  sort?: string;
  page?: number;
}) {
  const groups = await statusGroups();
  const problems = await problemMap();
  const and: any[] = [];

  const group = filters.group ?? "ALL";
  if (group === "PROBLEMS") and.push({ id: { in: Array.from(problems.keys()) } });
  else if (groups[group]) and.push({ status: { in: groups[group] as any } });

  if (filters.buyerId) and.push({ buyerId: filters.buyerId });
  if (filters.sellerId) and.push({ sellerId: filters.sellerId });

  const q = String(filters.q ?? "").replace(/^#/, "").trim();
  if (q) {
    if (/^[0-9a-zA-Z]{4,12}$/.test(q) && !/^\p{L}+$/u.test(q)) {
      and.push({ id: { endsWith: q.toLowerCase() } });
    } else {
      const people = await prisma.user.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true }, take: 200 });
      const ids = people.map((p) => p.id);
      and.push({ OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] });
    }
  }

  const region = filters.region ? REGIONS.find((r) => r.key === filters.region) : null;
  if (region) {
    const people = await prisma.user.findMany({ where: { location: { contains: region.name, mode: "insensitive" } }, select: { id: true }, take: 5000 });
    const ids = people.map((p) => p.id);
    and.push({ OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] });
  }

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
  if (filters.minTotal && filters.minTotal > 0) and.push({ total: { gte: filters.minTotal } });

  const where = and.length ? { AND: and } : {};
  const orderBy: any = filters.sort === "VALOR" ? { total: "desc" } : filters.sort === "ANTIGAS" ? { createdAt: "asc" } : { createdAt: "desc" };
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  const [total, rows, all, pending, inProgress, completed, cancelled] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }) as Promise<any[]>,
    prisma.order.count(),
    groups.PENDING.length ? prisma.order.count({ where: { status: { in: groups.PENDING as any } } }) : Promise.resolve(0),
    groups.IN_PROGRESS.length ? prisma.order.count({ where: { status: { in: groups.IN_PROGRESS as any } } }) : Promise.resolve(0),
    groups.COMPLETED.length ? prisma.order.count({ where: { status: { in: groups.COMPLETED as any } } }) : Promise.resolve(0),
    groups.CANCELLED.length ? prisma.order.count({ where: { status: { in: groups.CANCELLED as any } } }) : Promise.resolve(0),
  ]);

  const orderIds = rows.map((o) => o.id);
  const [people, items] = await Promise.all([
    peopleOf(rows.flatMap((o) => [o.buyerId, o.sellerId])),
    orderIds.length ? (prisma.orderItem.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, title: true, quantity: true } }) as Promise<any[]>) : Promise.resolve([] as any[]),
  ]);

  return {
    summary: { all, pending, inProgress, completed, cancelled, problems: problems.size },
    total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((o) => {
      const mine = items.filter((i) => i.orderId === o.id);
      return {
        id: o.id,
        code: shortId(o.id),
        status: String(o.status),
        stage: stageOf(o.status),
        total: Number(o.total) || 0,
        shippingCost: o.shippingCost ?? null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        idleDays: Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / DAY),
        buyer: people.get(o.buyerId) ? { id: o.buyerId, name: people.get(o.buyerId)!.name } : null,
        seller: people.get(o.sellerId) ? { id: o.sellerId, name: people.get(o.sellerId)!.name } : null,
        itemsCount: mine.length,
        itemsPreview: mine.slice(0, 2).map((i) => `${i.quantity}× ${i.title}`),
        problems: problems.get(o.id) ?? [],
      };
    }),
  };
}

// =====================================================================
// Uma encomenda com tudo o que lhe aconteceu
// =====================================================================
export async function getOrder(id: string) {
  const o: any = await prisma.order.findUnique({ where: { id } });
  if (!o) {
    throw new Error("Encomenda não encontrada.");
  }

  const [items, payments, deliveries, disputes, reports, cases, notes, audit, people, problems] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId: id } }) as Promise<any[]>,
    prisma.orderPayment.findMany({ where: { orderId: id } }) as Promise<any[]>,
    prisma.delivery.findMany({ where: { orderId: id } }) as Promise<any[]>,
    prisma.orderDispute.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" } }),
    prisma.contentReport.findMany({ where: { targetType: "ORDER", targetId: id }, orderBy: { createdAt: "desc" } }),
    prisma.agentCase.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" } }),
    prisma.orderNote.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.adminAudit.findMany({ where: { targetType: "ORDER", targetId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
    peopleOf([o.buyerId, o.sellerId]),
    problemMap(),
  ]);

  const deliveryIds = deliveries.map((d) => d.id);
  const events: any[] = deliveryIds.length ? await prisma.deliveryEvent.findMany({ where: { deliveryId: { in: deliveryIds } }, orderBy: { createdAt: "asc" }, take: 100 }) : [];
  const transporters = await peopleOf(deliveries.map((d) => d.transporterId));
  const authors = await peopleOf([...notes.map((n) => n.authorId), ...audit.map((a) => a.adminId), ...events.map((e) => e.actorId)]);

  const history = [
    { kind: "ENCOMENDA", text: "Encomenda feita", at: o.createdAt },
    ...payments.map((p) => ({ kind: "PAGAMENTO", text: `Pagamento registado (${p.method ?? "—"}, ${p.status ?? "—"})`, at: p.createdAt })),
    ...events.map((e) => ({ kind: "ENTREGA", text: `${e.kind}${e.message ? `: ${e.message}` : ""} (${authors.get(e.actorId)?.name ?? "—"})`, at: e.createdAt })),
    ...disputes.map((d) => ({ kind: "DISPUTA", text: `Disputa aberta: ${d.reason}`, at: d.createdAt })),
    ...notes.map((n) => ({ kind: "NOTA", text: `${authors.get(n.authorId)?.name ?? "Equipa"}: ${n.message}`, at: n.createdAt })),
    ...audit.map((a) => ({ kind: "ADMIN", text: a.summary, at: a.createdAt })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 60);

  return {
    order: {
      id: o.id,
      code: shortId(o.id),
      status: String(o.status),
      stage: stageOf(o.status),
      total: Number(o.total) || 0,
      shippingCost: o.shippingCost ?? null,
      paymentMethod: o.paymentMethod ?? null,
      desiredDate: o.desiredDate ?? null,
      buyerConfirmedAt: o.buyerConfirmedAt ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      idleDays: Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / DAY),
    },
    problems: problems.get(id) ?? [],
    buyer: people.get(o.buyerId) ?? null,
    seller: people.get(o.sellerId) ?? null,
    items: items.map((i) => ({ id: i.id, productId: i.productId ?? null, title: i.title, quantity: i.quantity, unitPrice: i.unitPrice ?? null })),
    payments: payments.map((p) => ({ id: p.id, amount: p.amount ?? null, method: p.method ?? null, status: p.status ?? null, reference: p.reference ?? null, createdAt: p.createdAt })),
    deliveries: deliveries.map((d) => ({
      id: d.id,
      status: String(d.status),
      lastLocation: d.lastLocation ?? null,
      lastLocationAt: d.lastLocationAt ?? null,
      transporter: d.transporterId && transporters.get(d.transporterId) ? { id: d.transporterId, name: transporters.get(d.transporterId)!.name } : null,
    })),
    disputes,
    reports,
    agentCases: cases,
    notes: notes.map((n) => ({ ...n, authorName: authors.get(n.authorId)?.name ?? "Equipa" })),
    history,
  };
}

// =====================================================================
// Ações da equipa
// =====================================================================
export async function addNote(admin: AdminSnapshot, id: string, messageInput: any) {
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) {
    throw new Error("Encomenda não encontrada.");
  }
  const message = clean(messageInput, 500);
  if (!message || message.length < 3) {
    throw new Error("Escreva a nota.");
  }

  await prisma.orderNote.create({ data: { orderId: id, authorId: admin.userId, message } });
  await logAudit(admin.userId, "ORDER_NOTE", { type: "ORDER", id }, `Nota na encomenda ${shortId(id)}`);
  return getOrder(id);
}

// Avisa o comprador, o vendedor ou os dois (fica registado na encomenda)
export async function notifyParties(admin: AdminSnapshot, id: string, input: any) {
  const o: any = await prisma.order.findUnique({ where: { id } });
  if (!o) {
    throw new Error("Encomenda não encontrada.");
  }

  const to = String(input?.to ?? "");
  if (!["BUYER", "SELLER", "BOTH"].includes(to)) {
    throw new Error("Escolha quem avisar.");
  }
  const message = clean(input?.message, 300);
  if (!message || message.length < 5) {
    throw new Error("Escreva a mensagem (pelo menos 5 letras).");
  }

  const ids = to === "BUYER" ? [o.buyerId] : to === "SELLER" ? [o.sellerId] : [o.buyerId, o.sellerId];
  await prisma.notification.createMany({
    data: Array.from(new Set(ids)).map((userId) => ({
      userId,
      type: "SISTEMA" as const,
      title: `Sobre a encomenda ${shortId(id)}`,
      message,
      relatedId: id,
    })),
  });
  await prisma.orderNote.create({ data: { orderId: id, authorId: admin.userId, message: `Aviso a ${to === "BUYER" ? "o comprador" : to === "SELLER" ? "o vendedor" : "o comprador e o vendedor"}: ${message}` } });
  await logAudit(admin.userId, "ORDER_NOTIFY", { type: "ORDER", id }, `Avisou os participantes da encomenda ${shortId(id)}`);

  return getOrder(id);
}
