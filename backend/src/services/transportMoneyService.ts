import { prisma } from "../lib/prisma";
import { clean } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { getSetting } from "../lib/platformSettings";
import { isStorageUrl } from "../lib/adminUserCatalog";
import { EXPENSE_KINDS, PAY_METHODS } from "../lib/transportMoneyCatalog";
import { loadAdmin } from "./adminAccess";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";

const DAY = 86400000;
const PAGE_SIZE = 30;
const METHOD_VALUES = values(PAY_METHODS);
const EXPENSE_VALUES = values(EXPENSE_KINDS);

function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function startOfDay(d: Date) {
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
export function r0(n: number) {
  return Math.round(n);
}
function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

export function parseDay(text: any, endOfDay = false): Date | null {
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

export function periodRange(filters: { from?: string; to?: string }, defaultDays = 30) {
  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - (defaultDays - 1) * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }
  return { from, to };
}

async function percentNow(): Promise<number> {
  return Math.min(30, Math.max(0, Number(await getSetting<number>("commissions.transportPercent")) || 0));
}

// As entregas concluídas antes desta versão ainda não têm o valor por receber: cria-se aqui, sem comissão
export async function ensurePayouts(userId: string, cards: any[]) {
  const delivered = cards.filter((c) => c.phase === "ENTREGUE" && c.payout && c.payout > 0);
  if (delivered.length === 0) return;

  const existing = await prisma.transportPayout.findMany({ where: { deliveryId: { in: delivered.map((c) => c.id) } }, select: { deliveryId: true } });
  const have = new Set(existing.map((e) => e.deliveryId));
  const missing = delivered.filter((c) => !have.has(c.id));
  if (missing.length === 0) return;

  await prisma.transportPayout.createMany({
    data: missing.map((c) => ({
      deliveryId: c.id,
      orderId: c.orderId,
      transporterId: userId,
      amount: c.payout,
      commissionPercent: 0,
      commissionAmount: 0,
      netAmount: c.payout,
      createdAt: c.deliveredAt ? new Date(c.deliveredAt) : new Date(),
    })),
    skipDuplicates: true,
  });
}

export function shapePayout(p: any, card?: any) {
  return {
    id: p.id,
    deliveryId: p.deliveryId,
    orderId: p.orderId,
    orderCode: shortId(p.orderId),
    amount: p.amount,
    commissionPercent: p.commissionPercent,
    commissionAmount: p.commissionAmount,
    netAmount: p.netAmount,
    status: p.status,
    method: p.method ?? null,
    reference: p.reference ?? null,
    note: p.note ?? null,
    receivedAt: p.receivedAt ?? null,
    createdAt: p.createdAt,
    ageDays: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / DAY),
    deliveredAt: card?.deliveredAt ?? p.createdAt,
    pickup: card?.pickup?.text ?? null,
    destination: card?.destination?.text ?? null,
    distanceKm: card?.distanceKm ?? null,
    weightKg: card?.weightKg ?? null,
    itemsPreview: card ? card.items.slice(0, 2).map((i: any) => i.title) : [],
    itemsCount: card?.itemsCount ?? 0,
    buyerName: card?.buyer?.name ?? null,
  };
}

async function cardMap(userId: string, profile: any) {
  const cards = await loadMineCards(userId, profile);
  await ensurePayouts(userId, cards);
  return { cards, map: new Map(cards.map((c) => [c.id, c])) };
}

async function financeAdmins(): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const snaps = await Promise.all(admins.map((a) => loadAdmin(a.id)));
  return snaps.filter((s) => s && s.status === "ATIVO" && s.permissions.has("finance.view")).map((s) => (s as any).userId as string);
}

// =====================================================================
// Resumo dos ganhos (hoje, semana, mês), pagamentos por receber e despesas
// =====================================================================
export async function getEarningsSummary(userId: string) {
  const profile = await ensureProfile(userId);
  const { cards, map } = await cardMap(userId, profile);

  const now = new Date();
  const [payouts, expenses, percent] = await Promise.all([
    prisma.transportPayout.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" }, take: 3000 }),
    prisma.transporterExpense.findMany({ where: { transporterId: userId, spentAt: { gte: new Date(now.getTime() - 400 * DAY) } }, take: 5000 }),
    percentNow(),
  ]);

  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  const range = (from: number) => {
    const list = payouts.filter((p) => new Date(p.createdAt).getTime() >= from);
    const spent = expenses.filter((e) => new Date(e.spentAt).getTime() >= from).reduce((s, e) => s + e.amount, 0);
    const net = list.reduce((s, p) => s + p.netAmount, 0);
    return {
      amount: r0(list.reduce((s, p) => s + p.amount, 0)),
      net: r0(net),
      count: list.length,
      expenses: r0(spent),
      profit: r0(net - spent),
    };
  };

  const byStatus = (status: string) => {
    const list = payouts.filter((p) => p.status === status);
    return { amount: r0(list.reduce((s, p) => s + p.netAmount, 0)), count: list.length, oldestAt: list.length ? list[list.length - 1].createdAt : null };
  };

  const byDay: { date: string; amount: number; count: number; expenses: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY));
    const list = payouts.filter((p) => dayKey(new Date(p.createdAt)) === key);
    byDay.push({
      date: key,
      amount: r0(list.reduce((s, p) => s + p.amount, 0)),
      count: list.length,
      expenses: r0(expenses.filter((e) => dayKey(new Date(e.spentAt)) === key).reduce((s, e) => s + e.amount, 0)),
    });
  }

  return {
    today: range(dayStart),
    week: range(weekStart),
    month: range(monthStart),
    total: { amount: r0(payouts.reduce((s, p) => s + p.amount, 0)), net: r0(payouts.reduce((s, p) => s + p.netAmount, 0)), count: payouts.length },
    pending: byStatus("PENDENTE"),
    received: byStatus("RECEBIDO"),
    contested: byStatus("CONTESTADO"),
    commissionPercent: percent,
    withoutValue: cards.filter((c) => c.phase === "ENTREGUE" && !(c.payout && c.payout > 0)).length,
    byDay,
    recent: payouts.slice(0, 10).map((p) => shapePayout(p, map.get(p.deliveryId))),
    note: "O valor de cada entrega é o transporte indicado na encomenda. O app não movimenta dinheiro: confirme aqui quando receber.",
  };
}

// =====================================================================
// Pagamentos recebidos e pendentes
// =====================================================================
export async function listPayouts(
  userId: string,
  role: string | undefined,
  filters: { status?: string; from?: string; to?: string; page?: number }
) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const { map } = await cardMap(userId, profile);

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  const where: any = { transporterId: userId };
  if (filters.status) where.status = filters.status;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows, groups] = await Promise.all([
    prisma.transportPayout.count({ where }),
    prisma.transportPayout.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.transportPayout.groupBy({ by: ["status"], where: { transporterId: userId }, _sum: { netAmount: true }, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {};
  const amounts: Record<string, number> = {};
  groups.forEach((g) => {
    counts[g.status] = g._count._all;
    amounts[g.status] = r0(Number(g._sum.netAmount ?? 0));
  });

  return { counts, amounts, total, page, pageSize: PAGE_SIZE, items: rows.map((p) => shapePayout(p, map.get(p.deliveryId))) };
}

async function loadPayout(userId: string, id: string) {
  const p = await prisma.transportPayout.findUnique({ where: { id } });
  if (!p || p.transporterId !== userId) {
    throw new Error("Pagamento não encontrado.");
  }
  return p;
}

// O transportador confirma que recebeu o valor do transporte
export async function confirmPayout(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const p = await loadPayout(userId, id);

  if (p.status === "RECEBIDO") {
    throw new Error("Este pagamento já está confirmado.");
  }
  const method = String(input?.method ?? "");
  if (!METHOD_VALUES.includes(method)) {
    throw new Error("Escolha como recebeu o pagamento.");
  }

  await prisma.transportPayout.update({
    where: { id },
    data: { status: "RECEBIDO", method, reference: clean(input?.reference, 60), note: clean(input?.note, 200), receivedAt: new Date() },
  });
  return { id, status: "RECEBIDO" };
}

// O transportador diz que não recebeu: a equipa financeira é avisada
export async function contestPayout(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const p = await loadPayout(userId, id);

  if (p.status !== "PENDENTE") {
    throw new Error(p.status === "RECEBIDO" ? "Este pagamento já está confirmado." : "Este pagamento já foi comunicado à equipa.");
  }
  const message = clean(input?.message, 300);
  if (!message || message.length < 5) {
    throw new Error("Explique o que se passou (pelo menos 5 letras).");
  }

  await prisma.transportPayout.update({ where: { id }, data: { status: "CONTESTADO", note: message } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const admins = await financeAdmins();
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((adminId) => ({
        userId: adminId,
        type: "SISTEMA" as const,
        title: "Transportador diz que não recebeu",
        message: `${user?.name ?? "Um transportador"}: encomenda ${shortId(p.orderId)}, ${r0(p.amount)} FCFA. ${message}`.slice(0, 300),
        relatedId: p.deliveryId,
      })),
    });
  }
  return { id, status: "CONTESTADO" };
}

// =====================================================================
// Despesas do veículo
// =====================================================================
function shapeExpense(e: any) {
  return {
    id: e.id,
    kind: e.kind,
    amount: e.amount,
    spentAt: e.spentAt,
    note: e.note ?? null,
    deliveryId: e.deliveryId ?? null,
    receiptUrl: e.receiptUrl ?? null,
  };
}

function readExpense(input: any) {
  const kind = String(input?.kind ?? "");
  if (!EXPENSE_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de despesa.");
  }
  const amount = Number(String(input?.amount ?? "").replace(",", "."));
  if (isNaN(amount) || amount <= 0 || amount > 100000000) {
    throw new Error("Indique o valor da despesa.");
  }

  const spentAt = input?.spentAt ? new Date(input.spentAt) : new Date();
  if (isNaN(spentAt.getTime()) || spentAt.getTime() > Date.now() + DAY) {
    throw new Error("Data da despesa inválida.");
  }
  if (spentAt.getTime() < Date.now() - 730 * DAY) {
    throw new Error("A data da despesa é demasiado antiga.");
  }

  const receiptUrl = input?.receiptUrl ? String(input.receiptUrl) : null;
  if (receiptUrl && !isStorageUrl(receiptUrl)) {
    throw new Error("Foto do recibo inválida. Envie a foto pelo app.");
  }

  return { kind, amount, spentAt, note: clean(input?.note, 200), receiptUrl };
}

export async function createExpense(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  const data = readExpense(input);

  let deliveryId: string | null = null;
  if (input?.deliveryId) {
    const d = await prisma.delivery.findUnique({ where: { id: String(input.deliveryId) } });
    if (!d || d.transporterId !== userId) {
      throw new Error("Entrega não encontrada.");
    }
    deliveryId = d.id;
  }

  const created = await prisma.transporterExpense.create({ data: { transporterId: userId, ...data, deliveryId } });
  return shapeExpense(created);
}

export async function updateExpense(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const found = await prisma.transporterExpense.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Despesa não encontrada.");
  }

  const data = readExpense({ ...found, ...input });
  const updated = await prisma.transporterExpense.update({ where: { id }, data });
  return shapeExpense(updated);
}

export async function deleteExpense(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);
  const found = await prisma.transporterExpense.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Despesa não encontrada.");
  }
  await prisma.transporterExpense.delete({ where: { id } });
  return { id, deleted: true };
}

export async function listExpenses(userId: string, role: string | undefined, filters: { from?: string; to?: string; kind?: string; page?: number }) {
  assertTransporter(role);
  const { from, to } = periodRange(filters, 30);

  const where: any = { transporterId: userId, spentAt: { gte: from, lte: to } };
  if (filters.kind && EXPENSE_VALUES.includes(filters.kind)) where.kind = filters.kind;

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows, groups] = await Promise.all([
    prisma.transporterExpense.count({ where }),
    prisma.transporterExpense.findMany({ where, orderBy: { spentAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.transporterExpense.groupBy({ by: ["kind"], where: { transporterId: userId, spentAt: { gte: from, lte: to } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  const byKind = groups.map((g) => ({ kind: g.kind, amount: r0(Number(g._sum.amount ?? 0)), count: g._count._all })).sort((a, b) => b.amount - a.amount);

  return {
    from,
    to,
    summary: { total: byKind.reduce((s, k) => s + k.amount, 0), count: byKind.reduce((s, k) => s + k.count, 0) },
    byKind,
    totalRows: total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map(shapeExpense),
  };
}

// Números do período, para o histórico financeiro e para o relatório
export async function financeMetrics(userId: string, from: Date, to: Date) {
  const [payouts, expenses] = await Promise.all([
    prisma.transportPayout.findMany({ where: { transporterId: userId, createdAt: { gte: from, lte: to } }, take: 5000 }),
    prisma.transporterExpense.findMany({ where: { transporterId: userId, spentAt: { gte: from, lte: to } }, take: 5000 }),
  ]);

  const sum = (list: any[], key: string) => r0(list.reduce((s, x) => s + (Number(x[key]) || 0), 0));
  const received = payouts.filter((p) => p.status === "RECEBIDO");
  const pending = payouts.filter((p) => p.status === "PENDENTE");
  const contested = payouts.filter((p) => p.status === "CONTESTADO");

  const kinds = new Map<string, number>();
  expenses.forEach((e) => kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + e.amount));

  const net = sum(payouts, "netAmount");
  const spent = sum(expenses, "amount");

  return {
    payouts,
    gross: sum(payouts, "amount"),
    commission: sum(payouts, "commissionAmount"),
    net,
    received: { amount: sum(received, "netAmount"), count: received.length },
    pending: { amount: sum(pending, "netAmount"), count: pending.length },
    contested: { amount: sum(contested, "netAmount"), count: contested.length },
    expenses: spent,
    expensesByKind: Array.from(kinds.entries()).map(([kind, amount]) => ({ kind, amount: r0(amount) })).sort((a, b) => b.amount - a.amount),
    profit: net - spent,
  };
}
