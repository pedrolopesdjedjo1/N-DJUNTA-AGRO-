import { prisma } from "../lib/prisma";
import { COMMISSION_STATUS, COMMISSION_WINDOW_DAYS, RECONCILE_DAYS } from "../lib/agentFinanceCatalog";
import { stageOf } from "../lib/agentOpsCatalog";
import { clean, clientScope, loadClientOrders, peopleMap, plain, safe } from "../lib/agentScope";
import { assertAdmin, assertAgent, ensureProfile } from "./agentService";

const DAY = 86400000;
const PAGE_SIZE = 30;
const RECONCILE_EVERY_MS = 2 * 60 * 1000;
const STATUS_VALUES = COMMISSION_STATUS.map((s) => s.value);
const lastReconcile = new Map<string, number>();

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(d: Date) {
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
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
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

function windowEnd(s: { expiresAt: Date; endedAt: Date | null }): number {
  return Math.min((s.endedAt ?? s.expiresAt).getTime(), s.expiresAt.getTime());
}

function isPendingPayment(status: any): boolean {
  const s = String(status ?? "").toUpperCase();
  return s.includes("PEND") || s.includes("AGUARD") || s.includes("ESPER") || s.includes("INFORM");
}

// =====================================================================
// Cálculo das comissões (cada encomenda só conta uma vez, para um só agente)
// =====================================================================
export async function reconcile(agentId: string, force = false): Promise<number> {
  const last = lastReconcile.get(agentId) ?? 0;
  if (!force && Date.now() - last < RECONCILE_EVERY_MS) return 0;
  lastReconcile.set(agentId, Date.now());

  const profile = await prisma.agentProfile.findUnique({ where: { userId: agentId } });
  if (!profile || profile.status !== "APROVADO" || !(profile.commissionRate > 0)) return 0;

  const since = new Date(Date.now() - RECONCILE_DAYS * DAY);
  const links = await prisma.agentClient.findMany({
    where: { agentId, consentAt: { not: null } },
    select: { clientId: true, origin: true, createdAt: true },
  });
  if (links.length === 0) return 0;

  const clientIds = links.map((l) => l.clientId);
  const orders: any[] = await prisma.order.findMany({
    where: { OR: [{ buyerId: { in: clientIds } }, { sellerId: { in: clientIds } }], updatedAt: { gte: since } },
    orderBy: { updatedAt: "desc" },
    take: 1500,
  });

  const done = orders.filter(
    (o) =>
      stageOf(o.status) === "CONCLUIDA" &&
      o.buyerId !== o.sellerId &&
      o.buyerId !== agentId &&
      o.sellerId !== agentId &&
      Number(o.total) > 0
  );
  if (done.length === 0) return 0;

  const existing = await prisma.agentCommission.findMany({ where: { orderId: { in: done.map((o) => o.id) } }, select: { orderId: true } });
  const taken = new Set(existing.map((e) => e.orderId));
  const open = done.filter((o) => !taken.has(o.id));
  if (open.length === 0) return 0;

  const sessions = await prisma.agentSession.findMany({
    where: { agentId, clientId: { in: clientIds }, startedAt: { gte: new Date(since.getTime() - DAY) } },
    select: { clientId: true, startedAt: true, expiresAt: true, endedAt: true },
  });
  const linkMap = new Map(links.map((l) => [l.clientId, l]));

  const rows: any[] = [];
  for (const o of open) {
    const created = new Date(o.createdAt).getTime();
    let reason: string | null = null;
    let clientId: string | null = null;

    // 1) O agente ajudou o comprador a fazer a encomenda
    if (
      linkMap.has(o.buyerId) &&
      sessions.some((s) => s.clientId === o.buyerId && created >= s.startedAt.getTime() - 60000 && created <= windowEnd(s) + 120000)
    ) {
      reason = "COMPRA_ASSISTIDA";
      clientId = o.buyerId;
    }

    // 2) O vendedor é um cliente que o agente registou há menos de 90 dias
    if (!reason) {
      const seller = linkMap.get(o.sellerId);
      if (
        seller &&
        seller.origin === "REGISTADO" &&
        created >= seller.createdAt.getTime() &&
        created <= seller.createdAt.getTime() + COMMISSION_WINDOW_DAYS * DAY
      ) {
        reason = "VENDA_CLIENTE";
        clientId = o.sellerId;
      }
    }

    if (!reason || !clientId) continue;

    const base = Math.round(Math.max(0, (Number(o.total) || 0) - (Number(o.shippingCost) || 0)));
    if (base <= 0) continue;

    rows.push({
      agentId,
      orderId: o.id,
      clientId,
      reason,
      base,
      rate: profile.commissionRate,
      amount: Math.round((base * profile.commissionRate) / 100),
      orderCompletedAt: new Date(o.updatedAt ?? o.createdAt),
    });
  }

  if (rows.length === 0) return 0;
  const result = await prisma.agentCommission.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

async function withOrders(entries: any[]) {
  if (entries.length === 0) return [];

  const orders: any[] = await safe(
    "encomendas das comissões",
    async () => (await prisma.order.findMany({ where: { id: { in: entries.map((e) => e.orderId) } } })) as any[],
    [] as any[]
  );
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const ids = Array.from(new Set([...entries.map((e) => e.clientId), ...orders.flatMap((o) => [o.buyerId, o.sellerId])].filter(Boolean))) as string[];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  return entries.map((e) => {
    const o = orderMap.get(e.orderId);
    return {
      ...e,
      clientName: e.clientId ? names.get(e.clientId) ?? null : null,
      order: o
        ? {
            id: o.id,
            stage: stageOf(o.status),
            total: Number(o.total) || 0,
            buyerName: names.get(o.buyerId) ?? null,
            sellerName: names.get(o.sellerId) ?? null,
          }
        : null,
    };
  });
}

function sum(rows: any[], field: "amount" | "base"): number {
  return Math.round(rows.reduce((s, r) => s + (Number(r[field]) || 0), 0));
}

// =====================================================================
// Ganhos do dia, da semana e do mês
// =====================================================================
export async function getEarnings(agentId: string, role: string | undefined) {
  assertAgent(role);
  const profile = await ensureProfile(agentId);
  await safe("comissões", () => reconcile(agentId), 0);

  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const from = new Date(Math.min(monthStart.getTime(), now.getTime() - 14 * DAY));

  const [rows, totals, last] = await Promise.all([
    prisma.agentCommission.findMany({
      where: { agentId, status: { not: "ANULADO" }, orderCompletedAt: { gte: from } },
      orderBy: { orderCompletedAt: "desc" },
      take: 2000,
    }),
    prisma.agentCommission.groupBy({ by: ["status"], where: { agentId }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.agentCommission.findMany({ where: { agentId }, orderBy: { orderCompletedAt: "desc" }, take: 8 }),
  ]);

  const range = (start: Date) => {
    const list = rows.filter((r) => r.orderCompletedAt.getTime() >= start.getTime());
    return { amount: sum(list, "amount"), orders: list.length, sales: sum(list, "base") };
  };

  const byDay: { date: string; amount: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * DAY));
    const key = dateKey(day);
    const list = rows.filter((r) => dateKey(r.orderCompletedAt) === key);
    byDay.push({ date: key, amount: sum(list, "amount"), orders: list.length });
  }

  const amountOf = (status: string) => Math.round(totals.find((t) => t.status === status)?._sum.amount ?? 0);

  return {
    enabled: profile.commissionRate > 0,
    rate: profile.commissionRate,
    today: range(dayStart),
    week: range(weekStart),
    month: range(monthStart),
    totals: {
      pending: amountOf("PENDENTE"),
      paid: amountOf("PAGO"),
      entries: totals.filter((t) => t.status !== "ANULADO").reduce((s, t) => s + t._count._all, 0),
    },
    byDay,
    recent: await withOrders(last),
    note:
      "Os valores são previstos. Contam as encomendas concluídas feitas com a sua ajuda e as vendas de clientes que registou nos últimos 90 dias. O pagamento é feito pela equipa do NÔDJUNTA AGRO.",
  };
}

// =====================================================================
// Histórico financeiro
// =====================================================================
export async function listCommissions(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; reason?: string; from?: string; to?: string; page?: number }
) {
  assertAgent(role);
  await safe("comissões", () => reconcile(agentId), 0);

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);

  const where: any = { agentId };
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.reason) where.reason = filters.reason;
  if (from || to) where.orderCompletedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const rows = await prisma.agentCommission.findMany({ where, orderBy: { orderCompletedAt: "desc" }, take: 1000 });
  const valid = rows.filter((r) => r.status !== "ANULADO");

  const months = new Map<string, { month: string; amount: number; orders: number; sales: number }>();
  valid.forEach((r) => {
    const key = monthKey(r.orderCompletedAt);
    const m = months.get(key) ?? { month: key, amount: 0, orders: 0, sales: 0 };
    m.amount += r.amount;
    m.orders += 1;
    m.sales += r.base;
    months.set(key, m);
  });

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    summary: {
      entries: valid.length,
      amount: sum(valid, "amount"),
      sales: sum(valid, "base"),
      pending: sum(rows.filter((r) => r.status === "PENDENTE"), "amount"),
      paid: sum(rows.filter((r) => r.status === "PAGO"), "amount"),
      voided: rows.filter((r) => r.status === "ANULADO").length,
    },
    byMonth: Array.from(months.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((m) => ({ ...m, amount: Math.round(m.amount), sales: Math.round(m.sales) })),
    total: rows.length,
    page,
    pageSize: PAGE_SIZE,
    items: await withOrders(slice),
  };
}

// =====================================================================
// Acompanhar pagamentos das encomendas dos clientes
// =====================================================================
export async function listPayments(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; linkId?: string; page?: number }
) {
  assertAgent(role);
  const scope = await clientScope(agentId);
  const orders = await loadClientOrders(scope.ids, 600);
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const payments: any[] = orders.length
    ? await safe(
        "pagamentos",
        async () => (await prisma.orderPayment.findMany({ where: { orderId: { in: orders.map((o) => o.id) } }, orderBy: { createdAt: "desc" }, take: 1500 })) as any[],
        [] as any[]
      )
    : [];

  const people = await peopleMap(
    orders.flatMap((o) => [o.buyerId, o.sellerId]),
    scope
  );

  let items = payments.map((p) => {
    const o = orderMap.get(p.orderId);
    return {
      id: p.id,
      orderId: p.orderId,
      amount: p.amount ?? null,
      method: p.method ?? null,
      status: p.status ? String(p.status) : null,
      reference: p.reference ?? null,
      createdAt: p.createdAt ?? null,
      pending: isPendingPayment(p.status),
      order: o
        ? {
            id: o.id,
            stage: stageOf(o.status),
            total: Number(o.total) || 0,
            buyer: people.get(o.buyerId) ?? null,
            seller: people.get(o.sellerId) ?? null,
          }
        : null,
    };
  });

  const counts = {
    pending: items.filter((i) => i.pending).length,
    confirmed: items.filter((i) => !i.pending).length,
    total: items.length,
    pendingValue: Math.round(items.filter((i) => i.pending).reduce((s, i) => s + (Number(i.amount) || 0), 0)),
  };

  if (filters.status === "pending") items = items.filter((i) => i.pending);
  else if (filters.status === "confirmed") items = items.filter((i) => !i.pending);

  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) {
      throw new Error("Cliente não encontrado.");
    }
    items = items.filter((i) => i.order?.buyer?.id === link.clientId || i.order?.seller?.id === link.clientId);
  }

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    counts,
    total: items.length,
    page,
    pageSize: PAGE_SIZE,
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

// =====================================================================
// Relatório de atividade do agente (só números, sem nomes de clientes)
// =====================================================================
export async function getReport(agentId: string, role: string | undefined, filters: { from?: string; to?: string }) {
  assertAgent(role);
  await safe("comissões", () => reconcile(agentId), 0);

  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - 29 * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }
  const range = { gte: from, lte: to };

  const [user, scope, attended, sessions, registered, invited, referrals, newClients, tasksDone, casesOpened, casesResolved, needsNew, needsForwarded, needsServed, commissions, profile] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: agentId }, select: { name: true } }),
      clientScope(agentId),
      prisma.agentActivity.findMany({
        where: { agentId, kind: { in: ["CONTACTO", "VISITA", "ATENDIMENTO", "ASSISTENCIA_INICIADA"] }, createdAt: range, NOT: { clientId: null } },
        select: { clientId: true },
        take: 5000,
      }),
      prisma.agentSession.findMany({ where: { agentId, startedAt: range }, select: { actions: true }, take: 3000 }),
      prisma.agentActivity.count({ where: { agentId, kind: "CADASTRO", createdAt: range } }),
      prisma.agentActivity.count({ where: { agentId, kind: "CONVITE", message: "Convite enviado", createdAt: range } }),
      prisma.agentActivity.count({ where: { agentId, kind: "OPORTUNIDADE", createdAt: range } }),
      prisma.agentClient.count({ where: { agentId, consentAt: range } }),
      prisma.agentTask.count({ where: { agentId, status: "FEITA", doneAt: range } }),
      prisma.agentCase.count({ where: { agentId, createdAt: range } }),
      prisma.agentCase.count({ where: { agentId, resolvedAt: range } }),
      prisma.agentNeed.count({ where: { agentId, createdAt: range } }),
      prisma.agentNeed.count({ where: { agentId, forwardedAt: range } }),
      prisma.agentNeed.count({ where: { agentId, status: "ATENDIDA", updatedAt: range } }),
      prisma.agentCommission.findMany({ where: { agentId, status: { not: "ANULADO" }, orderCompletedAt: range }, take: 2000 }),
      ensureProfile(agentId),
    ]);

  const orders = await safe(
    "encomendas do relatório",
    async () => {
      const rows = await loadClientOrders(scope.ids, 1500);
      const done = rows.filter((o) => {
        const t = new Date(o.updatedAt ?? o.createdAt).getTime();
        return stageOf(o.status) === "CONCLUIDA" && t >= from.getTime() && t <= to.getTime();
      });
      return { count: done.length, value: Math.round(done.reduce((s, o) => s + (Number(o.total) || 0), 0)) };
    },
    { count: 0, value: 0 }
  );

  const metrics = {
    activeClients: scope.ids.length,
    newClients,
    attendedPeople: new Set(attended.map((a) => a.clientId)).size,
    registered,
    invited,
    sessions: sessions.length,
    assistedActions: sessions.reduce((s, x) => s + x.actions, 0),
    referrals,
    tasksDone,
    casesOpened,
    casesResolved,
    needsNew,
    needsForwarded,
    needsServed,
    ordersCompleted: orders.count,
    salesValue: orders.value,
    commissions: {
      enabled: profile.commissionRate > 0,
      entries: commissions.length,
      amount: sum(commissions, "amount"),
      pending: sum(commissions.filter((c) => c.status === "PENDENTE"), "amount"),
      paid: sum(commissions.filter((c) => c.status === "PAGO"), "amount"),
    },
  };

  const label = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const lines = [
    "RELATÓRIO DO AGENTE · NÔDJUNTA AGRO",
    `Agente: ${user?.name ?? "—"}`,
    `Período: ${label(from)} a ${label(to)}`,
    "",
    "PESSOAS",
    `- Clientes ativos: ${metrics.activeClients}`,
    `- Novos clientes: ${metrics.newClients}`,
    `- Pessoas atendidas: ${metrics.attendedPeople}`,
    `- Contas registadas: ${metrics.registered}`,
    `- Convites enviados: ${metrics.invited}`,
    "",
    "AJUDA E ACOMPANHAMENTO",
    `- Sessões de ajuda: ${metrics.sessions} (${metrics.assistedActions} alteração(ões) feitas)`,
    `- Oportunidades e formações indicadas: ${metrics.referrals}`,
    `- Tarefas concluídas: ${metrics.tasksDone}`,
    `- Chamados abertos: ${metrics.casesOpened} · resolvidos: ${metrics.casesResolved}`,
    "",
    "COMUNIDADES",
    `- Necessidades identificadas: ${metrics.needsNew} · encaminhadas: ${metrics.needsForwarded} · atendidas: ${metrics.needsServed}`,
    "",
    "NEGÓCIOS",
    `- Encomendas concluídas dos clientes: ${metrics.ordersCompleted}`,
    `- Valor vendido: ${metrics.salesValue} FCFA`,
  ];
  if (metrics.commissions.enabled) {
    lines.push(
      "",
      "COMISSÕES",
      `- Comissões do período: ${metrics.commissions.amount} FCFA (${metrics.commissions.entries} encomenda(s))`,
      `- A receber: ${metrics.commissions.pending} FCFA · Pagas: ${metrics.commissions.paid} FCFA`
    );
  }
  lines.push("", "Relatório com números somados, sem nomes nem contactos de clientes.");

  return { from, to, metrics, text: lines.join("\n") };
}

// =====================================================================
// Equipa do app: pagar e acompanhar comissões
// =====================================================================
export async function adminCommissionsOverview(role: string | undefined, filters: { q?: string }) {
  assertAdmin(role);

  const groups = await prisma.agentCommission.groupBy({
    by: ["agentId", "status"],
    _sum: { amount: true },
    _count: { _all: true },
  });
  const agentIds = Array.from(new Set(groups.map((g) => g.agentId)));
  const [users, profiles] = agentIds.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, phone: true } }),
        prisma.agentProfile.findMany({ where: { userId: { in: agentIds } }, select: { userId: true, commissionRate: true, status: true } }),
      ])
    : [[], []];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const needle = plain(filters.q);
  const items = agentIds
    .map((id) => {
      const mine = groups.filter((g) => g.agentId === id);
      const of = (status: string) => Math.round(mine.find((g) => g.status === status)?._sum.amount ?? 0);
      const count = (status: string) => mine.find((g) => g.status === status)?._count._all ?? 0;
      return {
        agentId: id,
        agent: userMap.get(id) ?? null,
        rate: profileMap.get(id)?.commissionRate ?? 0,
        status: profileMap.get(id)?.status ?? null,
        pending: of("PENDENTE"),
        pendingEntries: count("PENDENTE"),
        paid: of("PAGO"),
      };
    })
    .filter((i) => !needle || plain(i.agent?.name).includes(needle))
    .sort((a, b) => b.pending - a.pending);

  return {
    totals: { pending: items.reduce((s, i) => s + i.pending, 0), paid: items.reduce((s, i) => s + i.paid, 0) },
    items,
  };
}

export async function adminListCommissions(role: string | undefined, filters: { agentId?: string; status?: string; page?: number }) {
  assertAdmin(role);

  const where: any = {};
  if (filters.agentId) where.agentId = filters.agentId;
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.agentCommission.count({ where }),
    prisma.agentCommission.findMany({ where, orderBy: { orderCompletedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return { total, page, pageSize: PAGE_SIZE, items: await withOrders(rows) };
}

// Marca como pagas as comissões a receber de um agente (todas, ou só as escolhidas)
export async function adminMarkPaid(role: string | undefined, adminId: string, input: any) {
  assertAdmin(role);

  const agentId = String(input?.agentId ?? "");
  if (!agentId) {
    throw new Error("Escolha o agente.");
  }

  const ids: string[] | null = Array.isArray(input?.ids) && input.ids.length > 0 ? input.ids.map(String).slice(0, 500) : null;
  const where: any = { agentId, status: "PENDENTE", ...(ids ? { id: { in: ids } } : {}) };

  const rows = await prisma.agentCommission.findMany({ where, take: 500 });
  if (rows.length === 0) {
    throw new Error("Não há comissões a receber para pagar.");
  }

  const amount = sum(rows, "amount");
  const note = clean(input?.note, 300);
  await prisma.agentCommission.updateMany({
    where: { id: { in: rows.map((r) => r.id) }, status: "PENDENTE" },
    data: { status: "PAGO", paidAt: new Date(), paidBy: adminId, note },
  });

  await prisma.notification.create({
    data: {
      userId: agentId,
      type: "SISTEMA",
      title: "Recebeu o pagamento das comissões",
      message: `A equipa registou o pagamento de ${amount} FCFA (${rows.length} encomenda(s)).${note ? ` ${note}` : ""}`.slice(0, 300),
      relatedId: rows[0].id,
    },
  });

  return { agentId, count: rows.length, amount };
}

export async function adminVoidCommission(role: string | undefined, adminId: string, id: string, noteInput: any) {
  assertAdmin(role);

  const found = await prisma.agentCommission.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Comissão não encontrada.");
  }
  if (found.status === "PAGO") {
    throw new Error("Uma comissão já paga não se anula.");
  }
  if (found.status === "ANULADO") {
    throw new Error("Esta comissão já está anulada.");
  }

  const note = clean(noteInput, 300);
  if (!note || note.length < 3) {
    throw new Error("Explique o motivo da anulação.");
  }

  await prisma.agentCommission.update({ where: { id }, data: { status: "ANULADO", note, paidBy: adminId } });
  await prisma.notification.create({
    data: {
      userId: found.agentId,
      type: "SISTEMA",
      title: "Uma comissão foi anulada",
      message: `${Math.round(found.amount)} FCFA: ${note}`.slice(0, 300),
      relatedId: id,
    },
  });

  return { id, voided: true };
}

export async function adminReconcile(role: string | undefined, agentUserId: string) {
  assertAdmin(role);
  const created = await reconcile(agentUserId, true);
  return { agentId: agentUserId, created };
}
