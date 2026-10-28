import { prisma } from "../lib/prisma";
import { findRegion } from "../lib/ngoRegions";
import { stageOf } from "../lib/agentOpsCatalog";
import { clean, plain } from "../lib/agentScope";
import { getSetting } from "../lib/platformSettings";
import { roleName } from "../lib/adminUserCatalog";
import { FLAG_RULES, REFUND_STATUS, payState } from "../lib/adminFinanceCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const DAY = 86400000;
const PAGE_SIZE = 30;

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}
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

function range(filters: { from?: string; to?: string }, defaultDays: number) {
  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - (defaultDays - 1) * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }
  return { from, to };
}

async function notify(ids: (string | null | undefined)[], title: string, message: string, relatedId: string) {
  const list = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (list.length === 0) return;
  await prisma.notification.createMany({ data: list.map((userId) => ({ userId, type: "SISTEMA" as const, title, message: message.slice(0, 300), relatedId })) });
}

async function peopleOf(ids: (string | null | undefined)[]) {
  const list = Array.from(new Set(ids.filter(Boolean))) as string[];
  const users = list.length ? await prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, name: true, phone: true, role: true, location: true } }) : [];
  return new Map(users.map((u) => [u.id, { ...u, roleName: roleName(u.role) }]));
}

// Os estados guardados que pertencem a cada etapa
let statusCache: { at: number; rows: string[] } | null = null;

async function statusesFor(stages: string[]): Promise<string[]> {
  if (!statusCache || Date.now() - statusCache.at > 60000) {
    const rows = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
    statusCache = { at: Date.now(), rows: rows.map((r) => String(r.status)) };
  }
  return statusCache.rows.filter((s) => stages.includes(stageOf(s)));
}

async function completedOrders(from: Date, to: Date): Promise<any[]> {
  const done = await statusesFor(["CONCLUIDA", "ENTREGUE"]);
  if (done.length === 0) return [];
  return prisma.order.findMany({
    where: { status: { in: done as any }, createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  }) as Promise<any[]>;
}

function netOf(o: any): number {
  return Math.max(0, (Number(o.total) || 0) - (Number(o.shippingCost) || 0));
}

// =====================================================================
// Visão geral
// =====================================================================
export async function financeOverview() {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const d7 = now.getTime() - 7 * DAY;
  const from = startOfDay(new Date(now.getTime() - 29 * DAY));

  const [sales, percent, payments, refunds, pendingCommissions, flags, candidates] = await Promise.all([
    completedOrders(from, now),
    getSetting<number>("commissions.platformPercent"),
    prisma.orderPayment.findMany({ orderBy: { createdAt: "desc" }, take: 5000 }) as Promise<any[]>,
    prisma.refund.findMany({ where: { status: { in: ["PENDENTE", "APROVADO"] } } }),
    prisma.agentCommission.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true }, _count: { _all: true } }),
    scanFlags(),
    refundCandidates(),
  ]);

  const sum = (list: any[], since: number) => {
    const rows = list.filter((o) => new Date(o.createdAt).getTime() >= since);
    return { count: rows.length, amount: r0(rows.reduce((s, o) => s + (Number(o.total) || 0), 0)) };
  };

  const pending = payments.filter((p) => payState(p.status) === "PENDENTE");
  const pendingOld = pending.filter((p) => now.getTime() - new Date(p.createdAt).getTime() > 3 * DAY);
  const net30 = sales.reduce((s, o) => s + netOf(o), 0);

  const trend: { date: string; amount: number; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY));
    const rows = sales.filter((o) => dayKey(new Date(o.createdAt)) === key);
    trend.push({ date: key, amount: r0(rows.reduce((s, o) => s + (Number(o.total) || 0), 0)), count: rows.length });
  }

  return {
    sales: { today: sum(sales, todayStart), week: sum(sales, d7), month: sum(sales, from.getTime()) },
    platform: { percent, estimated30: r0((net30 * percent) / 100) },
    payments: { pending: pending.length, pendingValue: r0(pending.reduce((s, p) => s + (Number(p.amount) || 0), 0)), pendingOver3Days: pendingOld.length },
    refunds: {
      toDecide: refunds.filter((r) => r.status === "PENDENTE").length,
      toPay: refunds.filter((r) => r.status === "APROVADO").length,
      toPayValue: r0(refunds.filter((r) => r.status === "APROVADO").reduce((s, r) => s + r.amount, 0)),
      toCreate: candidates.length,
    },
    commissions: { pending: r0(Number(pendingCommissions._sum.amount ?? 0)), entries: pendingCommissions._count._all },
    suspicious: { open: flags.filter((f) => !f.reviewed).length, high: flags.filter((f) => !f.reviewed && f.level === "ALTA").length },
    trend,
  };
}

// =====================================================================
// Vendas
// =====================================================================
export async function salesReport(filters: { from?: string; to?: string }) {
  const { from, to } = range(filters, 30);
  const orders = await completedOrders(from, to);
  const percent = await getSetting<number>("commissions.platformPercent");

  const ids = orders.map((o) => o.id);
  const [items, people] = await Promise.all([
    ids.length ? (prisma.orderItem.findMany({ where: { orderId: { in: ids } }, select: { orderId: true, productId: true, title: true, quantity: true, unitPrice: true } }) as Promise<any[]>) : Promise.resolve([] as any[]),
    peopleOf(orders.flatMap((o) => [o.sellerId, o.buyerId])),
  ]);

  const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean))) as string[];
  const products: any[] = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, department: true } }) : [];
  const deptMap = new Map(products.map((p) => [p.id, p.department ?? "OUTRO"]));

  const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const shipping = orders.reduce((s, o) => s + (Number(o.shippingCost) || 0), 0);
  const net = orders.reduce((s, o) => s + netOf(o), 0);

  // Por dia (períodos curtos) ou por mês (períodos longos)
  const monthly = (to.getTime() - from.getTime()) / DAY > 62;
  const buckets = new Map<string, { label: string; amount: number; count: number }>();
  for (let t = startOfDay(from).getTime(); t <= to.getTime(); t += DAY) {
    const d = new Date(t);
    const key = monthly ? monthKey(d) : dayKey(d);
    if (!buckets.has(key)) buckets.set(key, { label: key, amount: 0, count: 0 });
  }
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    const b = buckets.get(monthly ? monthKey(d) : dayKey(d));
    if (b) {
      b.amount += Number(o.total) || 0;
      b.count += 1;
    }
  });

  const byRegion = new Map<string, { name: string; amount: number; count: number }>();
  const bySeller = new Map<string, { id: string; name: string; amount: number; count: number }>();
  const byMethod = new Map<string, { method: string; amount: number; count: number }>();
  orders.forEach((o) => {
    const seller = people.get(o.sellerId);
    const regionName = findRegion(seller?.location)?.name ?? "Região por confirmar";
    const r = byRegion.get(regionName) ?? { name: regionName, amount: 0, count: 0 };
    r.amount += Number(o.total) || 0;
    r.count += 1;
    byRegion.set(regionName, r);

    const s = bySeller.get(o.sellerId) ?? { id: o.sellerId, name: seller?.name ?? "Vendedor", amount: 0, count: 0 };
    s.amount += Number(o.total) || 0;
    s.count += 1;
    bySeller.set(o.sellerId, s);

    const method = String(o.paymentMethod ?? "Não indicado");
    const m = byMethod.get(method) ?? { method, amount: 0, count: 0 };
    m.amount += Number(o.total) || 0;
    m.count += 1;
    byMethod.set(method, m);
  });

  const byDepartment = new Map<string, { department: string; amount: number; quantity: number }>();
  const byProduct = new Map<string, { title: string; amount: number; quantity: number }>();
  items.forEach((i) => {
    const amount = (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0);
    const dept = deptMap.get(i.productId) ?? "OUTRO";
    const d = byDepartment.get(dept) ?? { department: dept, amount: 0, quantity: 0 };
    d.amount += amount;
    d.quantity += Number(i.quantity) || 0;
    byDepartment.set(dept, d);

    const key = plain(i.title);
    const p = byProduct.get(key) ?? { title: String(i.title ?? "Produto"), amount: 0, quantity: 0 };
    p.amount += amount;
    p.quantity += Number(i.quantity) || 0;
    byProduct.set(key, p);
  });

  const top = <T extends { amount: number }>(map: Map<string, T>, n = 10) =>
    Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, n)
      .map((x) => ({ ...x, amount: r0(x.amount) }));

  return {
    from,
    to,
    summary: {
      count: orders.length,
      total: r0(total),
      average: orders.length ? r0(total / orders.length) : 0,
      shipping: r0(shipping),
      net: r0(net),
      platformPercent: percent,
      platformEstimate: r0((net * percent) / 100),
      capped: orders.length >= 5000,
    },
    series: Array.from(buckets.values()).map((b) => ({ ...b, amount: r0(b.amount) })),
    monthly,
    byRegion: top(byRegion),
    byDepartment: top(byDepartment),
    byMethod: top(byMethod),
    topSellers: top(bySeller),
    topProducts: top(byProduct),
    note: "Contam as encomendas concluídas ou entregues, pela data em que foram feitas. A comissão da plataforma é uma estimativa.",
  };
}

// =====================================================================
// Pagamentos
// =====================================================================
async function shapePayments(rows: any[]) {
  const orderIds = Array.from(new Set(rows.map((p) => p.orderId).filter(Boolean))) as string[];
  const orders: any[] = orderIds.length ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, total: true, status: true, buyerId: true, sellerId: true } }) : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const people = await peopleOf(orders.flatMap((o) => [o.buyerId, o.sellerId]));

  return rows.map((p) => {
    const o = orderMap.get(p.orderId);
    return {
      id: p.id,
      orderId: p.orderId,
      orderCode: shortId(p.orderId),
      amount: p.amount !== null && p.amount !== undefined ? Number(p.amount) : null,
      method: p.method ?? null,
      reference: p.reference ?? null,
      status: p.status ? String(p.status) : null,
      state: payState(p.status),
      createdAt: p.createdAt,
      ageDays: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / DAY),
      order: o ? { total: Number(o.total) || 0, stage: stageOf(o.status) } : null,
      buyer: o && people.get(o.buyerId) ? { id: o.buyerId, name: people.get(o.buyerId)!.name } : null,
      seller: o && people.get(o.sellerId) ? { id: o.sellerId, name: people.get(o.sellerId)!.name } : null,
    };
  });
}

export async function listPayments(filters: { state?: string; method?: string; from?: string; to?: string; q?: string; sort?: string; page?: number }) {
  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  const where: any = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

  const all: any[] = await prisma.orderPayment.findMany({ where, orderBy: { createdAt: "desc" }, take: 3000 });

  const counts: Record<string, number> = { PENDENTE: 0, CONFIRMADO: 0, FALHADO: 0 };
  const values: Record<string, number> = { PENDENTE: 0, CONFIRMADO: 0, FALHADO: 0 };
  const methods = new Map<string, { method: string; count: number; amount: number }>();
  all.forEach((p) => {
    const s = payState(p.status);
    counts[s] += 1;
    values[s] += Number(p.amount) || 0;
    const key = String(p.method ?? "Não indicado");
    const m = methods.get(key) ?? { method: key, count: 0, amount: 0 };
    m.count += 1;
    m.amount += Number(p.amount) || 0;
    methods.set(key, m);
  });

  let list = all;
  if (filters.state) list = list.filter((p) => payState(p.status) === filters.state);
  if (filters.method) list = list.filter((p) => String(p.method ?? "Não indicado") === filters.method);
  const needle = String(filters.q ?? "").replace(/^#/, "").trim().toLowerCase();
  if (needle) list = list.filter((p) => String(p.orderId).toLowerCase().endsWith(needle) || String(p.reference ?? "").toLowerCase().includes(needle));

  if (filters.sort === "ANTIGOS") list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (filters.sort === "VALOR") list = [...list].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    summary: {
      pending: counts.PENDENTE,
      pendingValue: r0(values.PENDENTE),
      pendingOver3Days: all.filter((p) => payState(p.status) === "PENDENTE" && Date.now() - new Date(p.createdAt).getTime() > 3 * DAY).length,
      confirmed: counts.CONFIRMADO,
      confirmedValue: r0(values.CONFIRMADO),
      failed: counts.FALHADO,
    },
    methods: Array.from(methods.values()).map((m) => ({ ...m, amount: r0(m.amount) })).sort((a, b) => b.amount - a.amount),
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: await shapePayments(list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)),
  };
}

// =====================================================================
// Transações (pagamentos, reembolsos e comissões num só histórico)
// =====================================================================
export async function listTransactions(filters: { kind?: string; from?: string; to?: string; q?: string; page?: number }) {
  const { from, to } = range(filters, 30);
  const wantsPay = !filters.kind || filters.kind === "PAGAMENTO";
  const wantsRefund = !filters.kind || filters.kind === "REEMBOLSO";
  const wantsComm = !filters.kind || filters.kind === "COMISSAO";

  const [payments, refunds, commissions] = await Promise.all([
    wantsPay ? (prisma.orderPayment.findMany({ where: { createdAt: { gte: from, lte: to } }, orderBy: { createdAt: "desc" }, take: 1500 }) as Promise<any[]>) : Promise.resolve([] as any[]),
    wantsRefund ? prisma.refund.findMany({ where: { status: "PAGO", paidAt: { gte: from, lte: to } }, take: 1000 }) : Promise.resolve([] as any[]),
    wantsComm ? (prisma.agentCommission.findMany({ where: { status: "PAGO", paidAt: { gte: from, lte: to } }, take: 1000 }) as Promise<any[]>) : Promise.resolve([] as any[]),
  ]);

  const people = await peopleOf([...refunds.map((r: any) => r.buyerId), ...commissions.map((c: any) => c.agentId)]);
  const payOrders: any[] = payments.length ? await prisma.order.findMany({ where: { id: { in: Array.from(new Set(payments.map((p) => p.orderId))) as string[] } }, select: { id: true, buyerId: true } }) : [];
  const payPeople = await peopleOf(payOrders.map((o) => o.buyerId));
  const buyerOf = new Map(payOrders.map((o) => [o.id, o.buyerId]));

  let rows = [
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "PAGAMENTO",
      amount: Number(p.amount) || 0,
      sign: 1,
      at: p.createdAt,
      state: payState(p.status),
      label: `Pagamento da encomenda ${shortId(p.orderId)}${p.method ? ` (${p.method})` : ""}`,
      party: payPeople.get(buyerOf.get(p.orderId) as string)?.name ?? null,
      orderId: p.orderId as string | null,
      reference: p.reference ?? null,
    })),
    ...refunds.map((r: any) => ({
      id: `ref-${r.id}`,
      kind: "REEMBOLSO",
      amount: r.amount,
      sign: -1,
      at: r.paidAt,
      state: "CONFIRMADO",
      label: `Reembolso da encomenda ${shortId(r.orderId)}`,
      party: people.get(r.buyerId)?.name ?? null,
      orderId: r.orderId as string | null,
      reference: null,
    })),
    ...commissions.map((c: any) => ({
      id: `com-${c.id}`,
      kind: "COMISSAO",
      amount: Number(c.amount) || 0,
      sign: -1,
      at: c.paidAt,
      state: "CONFIRMADO",
      label: `Comissão de agente (encomenda ${shortId(c.orderId)})`,
      party: people.get(c.agentId)?.name ?? null,
      orderId: c.orderId as string | null,
      reference: null,
    })),
  ];

  const needle = plain(filters.q);
  if (needle) rows = rows.filter((r) => plain(`${r.label} ${r.party} ${r.reference}`).includes(needle));
  rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const confirmedIn = rows.filter((r) => r.kind === "PAGAMENTO" && r.state === "CONFIRMADO").reduce((s, r) => s + r.amount, 0);
  const out = rows.filter((r) => r.sign < 0).reduce((s, r) => s + r.amount, 0);

  return {
    from,
    to,
    summary: { in: r0(confirmedIn), out: r0(out), balance: r0(confirmedIn - out), count: rows.length },
    total: rows.length,
    page,
    pageSize: PAGE_SIZE,
    items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => ({ ...r, amount: r0(r.amount) })),
  };
}

// =====================================================================
// Comissões dos agentes
// =====================================================================
export async function commissionsOverview(filters: { q?: string }) {
  const [groups, percent] = await Promise.all([
    prisma.agentCommission.groupBy({ by: ["agentId", "status"], _sum: { amount: true }, _count: { _all: true } }),
    getSetting<number>("commissions.platformPercent"),
  ]);

  const ids = Array.from(new Set(groups.map((g) => g.agentId)));
  const [people, profiles] = ids.length
    ? await Promise.all([peopleOf(ids), prisma.agentProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, commissionRate: true } })])
    : [new Map(), [] as any[]];
  const rateMap = new Map((profiles as any[]).map((p) => [p.userId, p.commissionRate]));

  const rows = ids.map((agentId) => {
    const mine = groups.filter((g) => g.agentId === agentId);
    const pick = (status: string) => mine.find((g) => g.status === status);
    return {
      agentId,
      name: people.get(agentId)?.name ?? "Agente",
      rate: rateMap.get(agentId) ?? 0,
      pending: r0(Number(pick("PENDENTE")?._sum.amount ?? 0)),
      pendingEntries: pick("PENDENTE")?._count._all ?? 0,
      paid: r0(Number(pick("PAGO")?._sum.amount ?? 0)),
      voided: pick("ANULADO")?._count._all ?? 0,
    };
  });

  const needle = plain(filters.q);
  const items = rows.filter((r) => !needle || plain(r.name).includes(needle)).sort((a, b) => b.pending - a.pending || b.paid - a.paid);

  return {
    platformPercent: percent,
    totals: { pending: items.reduce((s, r) => s + r.pending, 0), paid: items.reduce((s, r) => s + r.paid, 0) },
    items,
  };
}

export async function commissionRows(agentId: string) {
  const rows: any[] = await prisma.agentCommission.findMany({ where: { agentId }, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map((c) => ({
    id: c.id,
    orderId: c.orderId,
    orderCode: shortId(c.orderId),
    base: Number(c.base) || 0,
    rate: c.rate,
    amount: Number(c.amount) || 0,
    status: c.status,
    reason: c.reason ?? null,
    orderCompletedAt: c.orderCompletedAt ?? null,
    paidAt: c.paidAt ?? null,
    note: c.note ?? null,
  }));
}

export async function payAgentCommissions(admin: AdminSnapshot, agentId: string, noteInput: any) {
  const pending = await prisma.agentCommission.findMany({ where: { agentId, status: "PENDENTE" } });
  if (pending.length === 0) {
    throw new Error("Não há comissões por pagar a este agente.");
  }

  const note = clean(noteInput, 200);
  const amount = r0(pending.reduce((s, c) => s + (Number(c.amount) || 0), 0));
  await prisma.agentCommission.updateMany({ where: { agentId, status: "PENDENTE" }, data: { status: "PAGO", paidAt: new Date(), note } });

  const people = await peopleOf([agentId]);
  await notify([agentId], "Comissões pagas", `A equipa registou o pagamento de ${amount} FCFA (${pending.length} comissão(ões)).${note ? ` ${note}` : ""}`, agentId);
  await logAudit(admin.userId, "COMMISSION_PAY", { type: "USER", id: agentId }, `Registou o pagamento de ${amount} FCFA ao agente ${people.get(agentId)?.name ?? ""}`, { entries: pending.length });

  return { agentId, paid: pending.length, amount };
}

export async function voidCommission(admin: AdminSnapshot, id: string, noteInput: any) {
  const c: any = await prisma.agentCommission.findUnique({ where: { id } });
  if (!c) {
    throw new Error("Comissão não encontrada.");
  }
  if (c.status !== "PENDENTE") {
    throw new Error("Só se anulam comissões por pagar.");
  }
  const note = clean(noteInput, 200);
  if (!note || note.length < 3) {
    throw new Error("Explique o motivo da anulação.");
  }

  await prisma.agentCommission.update({ where: { id }, data: { status: "ANULADO", note } });
  await notify([c.agentId], "Uma comissão foi anulada", `Encomenda ${shortId(c.orderId)}: ${note}`, id);
  await logAudit(admin.userId, "COMMISSION_VOID", { type: "ORDER", id: c.orderId }, `Anulou uma comissão da encomenda ${shortId(c.orderId)}: ${note}`);
  return { id, voided: true };
}

// =====================================================================
// Reembolsos
// =====================================================================
async function shapeRefunds(rows: any[]) {
  const people = await peopleOf(rows.flatMap((r) => [r.buyerId, r.requestedBy, r.decidedBy, r.paidBy]));
  const orders: any[] = rows.length ? await prisma.order.findMany({ where: { id: { in: rows.map((r) => r.orderId) } }, select: { id: true, total: true } }) : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  return rows.map((r) => ({
    ...r,
    orderCode: shortId(r.orderId),
    orderTotal: orderMap.get(r.orderId) ? Number(orderMap.get(r.orderId).total) || 0 : null,
    buyerName: people.get(r.buyerId)?.name ?? "Comprador",
    requestedName: people.get(r.requestedBy)?.name ?? "Administrador",
    decidedName: r.decidedBy ? people.get(r.decidedBy)?.name ?? "Administrador" : null,
    paidName: r.paidBy ? people.get(r.paidBy)?.name ?? "Administrador" : null,
  }));
}

export async function listRefunds(filters: { status?: string; page?: number }) {
  const where: any = filters.status && REFUND_STATUS.some((s) => s.value === filters.status) ? { status: filters.status } : {};
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  const [total, rows, groups] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.refund.groupBy({ by: ["status"], _sum: { amount: true }, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {};
  const values: Record<string, number> = {};
  groups.forEach((g) => {
    counts[g.status] = g._count._all;
    values[g.status] = r0(Number(g._sum.amount ?? 0));
  });

  return { counts, values, total, page, pageSize: PAGE_SIZE, items: await shapeRefunds(rows) };
}

export async function getRefund(id: string) {
  const r = await prisma.refund.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Reembolso não encontrado.");
  }

  const [[card], dispute, payments, siblings] = await Promise.all([
    shapeRefunds([r]),
    r.disputeId ? prisma.orderDispute.findUnique({ where: { id: r.disputeId } }) : Promise.resolve(null),
    prisma.orderPayment.findMany({ where: { orderId: r.orderId } }) as Promise<any[]>,
    prisma.refund.findMany({ where: { orderId: r.orderId, id: { not: id } } }),
  ]);

  return {
    refund: card,
    dispute: dispute ? { id: dispute.id, reason: dispute.reason, decision: dispute.decision, decisionNote: dispute.decisionNote } : null,
    payments: payments.map((p) => ({ amount: p.amount ?? null, method: p.method ?? null, status: p.status ?? null, reference: p.reference ?? null })),
    otherRefunds: siblings.map((s) => ({ id: s.id, amount: s.amount, status: s.status })),
  };
}

// Disputas decididas com devolução que ainda não têm pedido de reembolso
export async function refundCandidates() {
  const [disputes, refunds] = await Promise.all([
    prisma.orderDispute.findMany({ where: { status: "RESOLVIDA", refundAmount: { gt: 0 } }, orderBy: { decidedAt: "desc" }, take: 200 }),
    prisma.refund.findMany({ where: { disputeId: { not: null } }, select: { disputeId: true } }),
  ]);
  const done = new Set(refunds.map((r) => r.disputeId));
  return disputes
    .filter((d) => !done.has(d.id))
    .map((d) => ({ disputeId: d.id, orderId: d.orderId, orderCode: shortId(d.orderId), amount: d.refundAmount as number, decidedAt: d.decidedAt, note: d.decisionNote }));
}

export async function createRefund(admin: AdminSnapshot, input: any) {
  const orderId = String(input?.orderId ?? "");
  const order: any = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
  if (!order) {
    throw new Error("Encomenda não encontrada.");
  }

  const amount = Number(String(input?.amount ?? "").replace(",", "."));
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Indique o valor a devolver.");
  }
  const reason = clean(input?.reason, 300);
  if (!reason || reason.length < 5) {
    throw new Error("Explique o motivo (pelo menos 5 letras).");
  }

  const active = await prisma.refund.findMany({ where: { orderId, status: { not: "RECUSADO" } } });
  const already = active.reduce((s, r) => s + r.amount, 0);
  if (already + amount > Number(order.total) + 0.001) {
    throw new Error(`O total devolvido não pode passar o valor da encomenda (${Number(order.total)} FCFA). Já há ${r0(already)} FCFA em reembolsos.`);
  }

  let disputeId: string | null = null;
  if (input?.disputeId) {
    const d = await prisma.orderDispute.findUnique({ where: { id: String(input.disputeId) } });
    if (!d || d.orderId !== orderId || d.status !== "RESOLVIDA") {
      throw new Error("Disputa inválida para esta encomenda.");
    }
    if (await prisma.refund.findFirst({ where: { disputeId: d.id } })) {
      throw new Error("Esta disputa já tem um pedido de reembolso.");
    }
    disputeId = d.id;
  }

  const created = await prisma.refund.create({
    data: { orderId, disputeId, buyerId: order.buyerId, amount, reason, requestedBy: admin.userId },
  });
  await logAudit(admin.userId, "REFUND_CREATE", { type: "ORDER", id: orderId }, `Criou um reembolso de ${r0(amount)} FCFA na encomenda ${shortId(orderId)}`, { reason });
  return getRefund(created.id);
}

export async function decideRefund(admin: AdminSnapshot, id: string, input: any) {
  const r = await prisma.refund.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Reembolso não encontrado.");
  }
  if (r.status !== "PENDENTE") {
    throw new Error("Este reembolso já foi decidido.");
  }
  // Quem cria o pedido não o aprova (só o Super administrador pode, para equipas pequenas)
  if (r.requestedBy === admin.userId && admin.level !== "SUPER_ADMIN") {
    throw new Error("O pedido tem de ser decidido por outro administrador.");
  }

  const approve = input?.approve === true;
  const note = clean(input?.note, 300);
  if (!approve && (!note || note.length < 3)) {
    throw new Error("Explique porque o reembolso é recusado.");
  }

  await prisma.refund.update({ where: { id }, data: { status: approve ? "APROVADO" : "RECUSADO", decisionNote: note, decidedBy: admin.userId, decidedAt: new Date() } });

  const order: any = await prisma.order.findUnique({ where: { id: r.orderId }, select: { sellerId: true } });
  await notify(
    [r.buyerId],
    approve ? "Reembolso aprovado" : "Reembolso recusado",
    approve ? `A equipa aprovou a devolução de ${r0(r.amount)} FCFA da encomenda ${shortId(r.orderId)}. Receberá o valor combinado.` : `Encomenda ${shortId(r.orderId)}: ${note}`,
    id
  );
  if (approve) await notify([order?.sellerId], "Reembolso aprovado ao comprador", `A equipa aprovou a devolução de ${r0(r.amount)} FCFA da encomenda ${shortId(r.orderId)}.`, id);
  await logAudit(admin.userId, "REFUND_DECIDE", { type: "ORDER", id: r.orderId }, `${approve ? "Aprovou" : "Recusou"} um reembolso de ${r0(r.amount)} FCFA (${shortId(r.orderId)})`, { note });

  return getRefund(id);
}

export async function payRefund(admin: AdminSnapshot, id: string, noteInput: any) {
  const r = await prisma.refund.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Reembolso não encontrado.");
  }
  if (r.status !== "APROVADO") {
    throw new Error("Só se pagam reembolsos aprovados.");
  }
  const note = clean(noteInput, 200);
  if (!note || note.length < 3) {
    throw new Error("Escreva como foi pago (ex: dinheiro móvel, referência).");
  }

  await prisma.refund.update({ where: { id }, data: { status: "PAGO", paidNote: note, paidBy: admin.userId, paidAt: new Date() } });
  await notify([r.buyerId], "Reembolso pago", `Recebeu a devolução de ${r0(r.amount)} FCFA da encomenda ${shortId(r.orderId)}.`, id);
  await logAudit(admin.userId, "REFUND_PAY", { type: "ORDER", id: r.orderId }, `Registou o pagamento de um reembolso de ${r0(r.amount)} FCFA (${shortId(r.orderId)})`, { note });

  return getRefund(id);
}

// O comprador vê os seus reembolsos
export async function myRefunds(userId: string) {
  const rows = await prisma.refund.findMany({ where: { buyerId: userId }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderCode: shortId(r.orderId),
    amount: r.amount,
    status: r.status,
    reason: r.reason,
    decisionNote: r.status === "RECUSADO" ? r.decisionNote : null,
    createdAt: r.createdAt,
    paidAt: r.paidAt,
  }));
}

// =====================================================================
// Alertas de transações suspeitas
// =====================================================================
interface Flag {
  key: string;
  rule: string;
  level: string;
  title: string;
  detail: string;
  orderId: string | null;
  userId: string | null;
  amount: number | null;
  at: Date;
  reviewed: boolean;
}

let flagCache: { at: number; list: Flag[] } | null = null;

async function scanFlags(): Promise<Flag[]> {
  if (flagCache && Date.now() - flagCache.at < 120000) return flagCache.list;

  const now = Date.now();
  const threshold = await getSetting<number>("finance.suspiciousOrderAmount");

  const [orders, payments, refunds, reviews] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: new Date(now - 30 * DAY) } }, orderBy: { createdAt: "desc" }, take: 5000 }) as Promise<any[]>,
    prisma.orderPayment.findMany({ where: { createdAt: { gte: new Date(now - 30 * DAY) } }, take: 5000 }) as Promise<any[]>,
    prisma.refund.findMany({ where: { createdAt: { gte: new Date(now - 60 * DAY) }, status: { not: "RECUSADO" } } }),
    prisma.financeFlagReview.findMany(),
  ]);
  const reviewed = new Set(reviews.map((r) => r.key));

  const ids = Array.from(new Set(orders.flatMap((o) => [o.buyerId, o.sellerId]).filter(Boolean))) as string[];
  const people = await peopleOf(ids);
  const name = (id: string) => people.get(id)?.name ?? "Utilizador";
  const flags: Flag[] = [];
  const add = (f: Omit<Flag, "reviewed">) => flags.push({ ...f, reviewed: reviewed.has(f.key) });

  // 1. Valor muito alto
  if (threshold > 0) {
    orders
      .filter((o) => (Number(o.total) || 0) >= threshold && stageOf(o.status) !== "CANCELADA")
      .forEach((o) =>
        add({
          key: `big:${o.id}`,
          rule: "BIG",
          level: Number(o.total) >= threshold * 3 ? "ALTA" : "MEDIA",
          title: `Encomenda ${shortId(o.id)} de ${r0(Number(o.total))} FCFA`,
          detail: `${name(o.buyerId)} compra a ${name(o.sellerId)}. O limite de revisão é ${r0(threshold)} FCFA.`,
          orderId: o.id,
          userId: o.buyerId,
          amount: Number(o.total),
          at: o.createdAt,
        })
      );
  }

  // 2. Referência de pagamento repetida em encomendas diferentes
  const refs = new Map<string, Set<string>>();
  payments.forEach((p) => {
    const ref = String(p.reference ?? "").trim().toLowerCase();
    if (ref.length >= 4) refs.set(ref, new Set([...(refs.get(ref) ?? []), p.orderId]));
  });
  refs.forEach((orderIds, ref) => {
    if (orderIds.size >= 2) {
      const list = Array.from(orderIds);
      add({
        key: `dupref:${ref}`,
        rule: "DUP_REF",
        level: "ALTA",
        title: `A referência "${ref}" foi usada em ${orderIds.size} encomendas`,
        detail: `Encomendas: ${list.map(shortId).join(", ")}. Uma referência só deve servir um pagamento.`,
        orderId: list[0],
        userId: null,
        amount: null,
        at: new Date(),
      });
    }
  });

  // 3. Muitas encomendas canceladas (7 dias)
  const week = Math.floor(now / (7 * DAY));
  const cancelled = new Map<string, number>();
  orders
    .filter((o) => now - new Date(o.createdAt).getTime() <= 7 * DAY && stageOf(o.status) === "CANCELADA")
    .forEach((o) => cancelled.set(o.buyerId, (cancelled.get(o.buyerId) ?? 0) + 1));
  cancelled.forEach((count, buyerId) => {
    if (count >= 3) {
      add({
        key: `cancel:${buyerId}:${week}`,
        rule: "CANCEL_STREAK",
        level: "MEDIA",
        title: `${name(buyerId)} cancelou ${count} encomendas em 7 dias`,
        detail: "Pode ser abuso ou falta de stock dos vendedores. Veja as encomendas.",
        orderId: null,
        userId: buyerId,
        amount: null,
        at: new Date(),
      });
    }
  });

  // 4 e 5. Mesma conta ou mesmo telefone dos dois lados
  const phones = new Map(
    Array.from(people.values()).map((u) => [u.id, String(u.phone ?? "").replace(/\D/g, "").slice(-8)])
  );
  orders.forEach((o) => {
    if (o.buyerId === o.sellerId) {
      add({
        key: `self:${o.id}`,
        rule: "SELF",
        level: "ALTA",
        title: `${name(o.buyerId)} comprou a si próprio (${shortId(o.id)})`,
        detail: "O comprador e o vendedor são a mesma conta.",
        orderId: o.id,
        userId: o.buyerId,
        amount: Number(o.total),
        at: o.createdAt,
      });
    } else if (phones.get(o.buyerId) && phones.get(o.buyerId) === phones.get(o.sellerId)) {
      add({
        key: `phone:${o.id}`,
        rule: "SAME_PHONE",
        level: "ALTA",
        title: `Encomenda ${shortId(o.id)} entre contas com o mesmo telefone`,
        detail: `${name(o.buyerId)} e ${name(o.sellerId)} têm o mesmo número.`,
        orderId: o.id,
        userId: o.buyerId,
        amount: Number(o.total),
        at: o.createdAt,
      });
    }
  });

  // 6. Muitas encomendas seguidas entre as mesmas duas pessoas (4 em 24 horas)
  const pairs = new Map<string, any[]>();
  orders.forEach((o) => pairs.set(`${o.buyerId}|${o.sellerId}`, [...(pairs.get(`${o.buyerId}|${o.sellerId}`) ?? []), o]));
  pairs.forEach((list, key) => {
    const times = list.map((o) => new Date(o.createdAt).getTime()).sort((a, b) => a - b);
    for (let i = 0; i + 3 < times.length; i++) {
      if (times[i + 3] - times[i] <= DAY) {
        const [buyerId, sellerId] = key.split("|");
        add({
          key: `burst:${key}:${dayKey(new Date(times[i]))}`,
          rule: "BURST",
          level: "MEDIA",
          title: `${list.length} encomendas de ${name(buyerId)} a ${name(sellerId)}`,
          detail: "Pelo menos 4 encomendas em 24 horas entre as mesmas pessoas.",
          orderId: list[0].id,
          userId: buyerId,
          amount: null,
          at: new Date(times[i + 3]),
        });
        break;
      }
    }
  });

  // 7. Muitos reembolsos do mesmo comprador
  const refunded = new Map<string, number>();
  refunds.forEach((r) => refunded.set(r.buyerId, (refunded.get(r.buyerId) ?? 0) + 1));
  const refundPeople = await peopleOf(Array.from(refunded.keys()));
  refunded.forEach((count, buyerId) => {
    if (count >= 3) {
      add({
        key: `refunds:${buyerId}`,
        rule: "REFUNDS",
        level: "MEDIA",
        title: `${refundPeople.get(buyerId)?.name ?? "Um comprador"} tem ${count} reembolsos em 60 dias`,
        detail: "Veja o histórico antes de aprovar outro.",
        orderId: null,
        userId: buyerId,
        amount: null,
        at: new Date(),
      });
    }
  });

  flags.sort((a, b) => Number(a.reviewed) - Number(b.reviewed) || (a.level === b.level ? 0 : a.level === "ALTA" ? -1 : 1) || new Date(b.at).getTime() - new Date(a.at).getTime());
  flagCache = { at: Date.now(), list: flags };
  return flags;
}

export async function listFlags(filters: { rule?: string; showReviewed?: string; page?: number }) {
  const all = await scanFlags();
  const counts: Record<string, number> = {};
  all.filter((f) => !f.reviewed).forEach((f) => (counts[f.rule] = (counts[f.rule] ?? 0) + 1));

  let list = filters.showReviewed === "true" ? all : all.filter((f) => !f.reviewed);
  if (filters.rule && FLAG_RULES.some((r) => r.value === filters.rule)) list = list.filter((f) => f.rule === filters.rule);

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    counts,
    open: all.filter((f) => !f.reviewed).length,
    high: all.filter((f) => !f.reviewed && f.level === "ALTA").length,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    note: "Os alertas vêm das regras automáticas dos últimos 30 dias. Um alerta não é uma prova: é um pedido para a equipa ver o caso.",
  };
}

export async function reviewFlag(admin: AdminSnapshot, input: any) {
  const key = String(input?.key ?? "");
  const flag = (await scanFlags()).find((f) => f.key === key);
  if (!flag) {
    throw new Error("Alerta não encontrado.");
  }
  const note = clean(input?.note, 300);
  if (!note || note.length < 3) {
    throw new Error("Explique o que concluiu (fica registado).");
  }

  await prisma.financeFlagReview.upsert({ where: { key }, create: { key, note, reviewedBy: admin.userId }, update: { note, reviewedBy: admin.userId, reviewedAt: new Date() } });
  flagCache = null;
  await logAudit(admin.userId, "FLAG_REVIEW", flag.orderId ? { type: "ORDER", id: flag.orderId } : null, `Revisou um alerta financeiro: ${flag.title}`, { note });
  return { key, reviewed: true };
}

// =====================================================================
// Relatório financeiro (texto para partilhar)
// =====================================================================
export async function financialReport(filters: { from?: string; to?: string }) {
  const { from, to } = range(filters, 30);

  const [sales, percent, payments, refunds, commissions, pendingNow, flags] = await Promise.all([
    salesReport({ from: filters.from, to: filters.to }),
    getSetting<number>("commissions.platformPercent"),
    prisma.orderPayment.findMany({ where: { createdAt: { gte: from, lte: to } }, take: 5000 }) as Promise<any[]>,
    prisma.refund.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.agentCommission.findMany({ where: { OR: [{ paidAt: { gte: from, lte: to } }, { createdAt: { gte: from, lte: to } }] }, take: 5000 }) as Promise<any[]>,
    prisma.orderPayment.findMany({ orderBy: { createdAt: "desc" }, take: 5000 }) as Promise<any[]>,
    scanFlags(),
  ]);

  const confirmed = payments.filter((p) => payState(p.status) === "CONFIRMADO");
  const pending = pendingNow.filter((p) => payState(p.status) === "PENDENTE");
  const refundPaid = refunds.filter((r) => r.status === "PAGO");
  const refundOpen = refunds.filter((r) => r.status === "PENDENTE" || r.status === "APROVADO");
  const commPaid = commissions.filter((c) => c.status === "PAGO" && c.paidAt && new Date(c.paidAt) >= from && new Date(c.paidAt) <= to);
  const commPending = commissions.filter((c) => c.status === "PENDENTE");

  const sum = (list: any[], key: string) => r0(list.reduce((s, x) => s + (Number(x[key]) || 0), 0));
  const metrics = {
    sales: sales.summary,
    payments: { confirmedCount: confirmed.length, confirmed: sum(confirmed, "amount"), pendingCount: pending.length, pending: sum(pending, "amount") },
    refunds: { paidCount: refundPaid.length, paid: sum(refundPaid, "amount"), openCount: refundOpen.length, open: sum(refundOpen, "amount") },
    commissions: { paidCount: commPaid.length, paid: sum(commPaid, "amount"), pendingCount: commPending.length, pending: sum(commPending, "amount") },
    suspiciousOpen: flags.filter((f) => !f.reviewed).length,
  };

  const label = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const lines = [
    "RELATÓRIO FINANCEIRO · NÔDJUNTA AGRO",
    `Período: ${label(from)} a ${label(to)}`,
    "",
    "VENDAS",
    `- Encomendas concluídas: ${metrics.sales.count}`,
    `- Valor vendido: ${metrics.sales.total} FCFA (média ${metrics.sales.average} FCFA)`,
    `- Transporte incluído: ${metrics.sales.shipping} FCFA`,
    `- Comissão estimada da plataforma (${percent}%): ${metrics.sales.platformEstimate} FCFA`,
    "",
    "PAGAMENTOS",
    `- Confirmados: ${metrics.payments.confirmedCount} (${metrics.payments.confirmed} FCFA)`,
    `- Por confirmar agora: ${metrics.payments.pendingCount} (${metrics.payments.pending} FCFA)`,
    "",
    "REEMBOLSOS",
    `- Pagos: ${metrics.refunds.paidCount} (${metrics.refunds.paid} FCFA)`,
    `- Em curso: ${metrics.refunds.openCount} (${metrics.refunds.open} FCFA)`,
    "",
    "COMISSÕES DE AGENTES",
    `- Pagas no período: ${metrics.commissions.paidCount} (${metrics.commissions.paid} FCFA)`,
    `- Por pagar: ${metrics.commissions.pendingCount} (${metrics.commissions.pending} FCFA)`,
    "",
    `ALERTAS DE TRANSAÇÕES POR REVER: ${metrics.suspiciousOpen}`,
    "",
    "O app não movimenta dinheiro: os valores são os registados pelos utilizadores e pela equipa.",
  ];

  return { from, to, metrics, text: lines.join("\n") };
}
