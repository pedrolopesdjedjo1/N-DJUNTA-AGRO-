import { prisma } from "../lib/prisma";
import { getSetting } from "../lib/platformSettings";
import { clean } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { isStorageUrl } from "../lib/adminUserCatalog";
import { EXPENSE_KINDS, PAYMENT_METHODS, PAYOUT_STATUS } from "../lib/transportBusinessCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";
import { fileReport } from "./adminReportService";

const DAY = 86400000;
const PAGE_SIZE = 30;
const METHOD_VALUES = values(PAYMENT_METHODS);
const EXPENSE_VALUES = values(EXPENSE_KINDS);
const STATUS_VALUES = values(PAYOUT_STATUS);

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
function r0(n: number) {
  return Math.round(n);
}
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

// As entregas concluídas antes deste registo ganham o seu valor por receber (as dos últimos 30 dias)
// ou já recebido (as mais antigas), para o histórico não ficar vazio.
const backfilled = new Map<string, number>();

async function backfillPayouts(userId: string, cards: any[]) {
  const last = backfilled.get(userId);
  if (last && Date.now() - last < 600000) return;
  backfilled.set(userId, Date.now());

  const done = cards.filter((c) => c.phase === "ENTREGUE" && (c.payout ?? 0) > 0);
  if (done.length === 0) return;

  const existing = await prisma.transportPayout.findMany({
    where: { transporterId: userId, deliveryId: { in: done.map((c) => c.id) } },
    select: { deliveryId: true },
  });
  const have = new Set(existing.map((e) => e.deliveryId));
  const missing = done.filter((c) => !have.has(c.id));
  if (missing.length === 0) return;

  const recent = Date.now() - 30 * DAY;
  await prisma.transportPayout.createMany({
    data: missing.map((c) => {
      const at = c.deliveredAt ? new Date(c.deliveredAt) : new Date();
      const isRecent = at.getTime() >= recent;
      return {
        deliveryId: c.id,
        orderId: c.orderId,
        transporterId: userId,
        amount: c.payout as number,
        commissionPercent: 0,
        commissionAmount: 0,
        netAmount: c.payout as number,
        status: isRecent ? "PENDENTE" : "RECEBIDO",
        receivedAt: isRecent ? null : at,
        note: isRecent ? null : "Anterior ao registo de pagamentos",
        createdAt: at,
      };
    }),
    skipDuplicates: true,
  });
}

function sumOf(rows: any[]) {
  return {
    amount: r0(rows.reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    net: r0(rows.reduce((s, p) => s + (Number(p.netAmount) || 0), 0)),
    commission: r0(rows.reduce((s, p) => s + (Number(p.commissionAmount) || 0), 0)),
    count: rows.length,
  };
}

// =====================================================================
// Ganhos: dia, semana, mês, por receber e recebido
// =====================================================================
export async function getFinance(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const cards = await loadMineCards(userId, profile);
  await backfillPayouts(userId, cards);

  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  const [payouts, expenses, percent] = await Promise.all([
    prisma.transportPayout.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" }, take: 3000 }),
    prisma.transporterExpense.findMany({ where: { transporterId: userId, spentAt: { gte: new Date(monthStart) } }, take: 3000 }),
    getSetting<number>("commissions.transportPercent"),
  ]);

  const since = (from: number) => payouts.filter((p) => new Date(p.createdAt).getTime() >= from);
  const month = sumOf(since(monthStart));
  const expensesMonth = r0(expenses.reduce((s, e) => s + e.amount, 0));
  const expensesWeek = r0(expenses.filter((e) => new Date(e.spentAt).getTime() >= weekStart).reduce((s, e) => s + e.amount, 0));

  const byDay: { date: string; amount: number; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY));
    const rows = payouts.filter((p) => dayKey(new Date(p.createdAt)) === key);
    byDay.push({ date: key, amount: r0(rows.reduce((s, p) => s + p.amount, 0)), count: rows.length });
  }

  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const status = (s: string) => sumOf(payouts.filter((p) => p.status === s));

  return {
    today: sumOf(since(dayStart)),
    week: sumOf(since(weekStart)),
    month,
    total: sumOf(payouts),
    withoutValue: cards.filter((c) => c.phase === "ENTREGUE" && !((c.payout ?? 0) > 0)).length,
    byDay,
    pending: status("PENDENTE"),
    received: status("RECEBIDO"),
    contested: status("CONTESTADO"),
    expenses: { week: expensesWeek, month: expensesMonth },
    profitMonth: month.net - expensesMonth,
    commission: { percent: Math.max(0, Number(percent) || 0), month: month.commission },
    recent: payouts.slice(0, 10).map((p) => ({
      id: p.deliveryId,
      payoutId: p.id,
      orderCode: shortId(p.orderId),
      payout: p.amount,
      net: p.netAmount,
      status: p.status,
      deliveredAt: p.createdAt,
      pickup: cardMap.get(p.deliveryId)?.pickup?.text ?? null,
      destination: cardMap.get(p.deliveryId)?.destination?.text ?? null,
    })),
    note: "O valor de cada entrega é o transporte indicado na encomenda. O app não movimenta dinheiro: confirme aqui quando receber.",
  };
}

// =====================================================================
// Pagamentos recebidos e pendentes
// =====================================================================
function shapePayout(p: any, card: any) {
  return {
    id: p.id,
    deliveryId: p.deliveryId,
    orderCode: shortId(p.orderId),
    amount: p.amount,
    commissionPercent: p.commissionPercent,
    commissionAmount: p.commissionAmount,
    net: p.netAmount,
    status: p.status,
    method: p.method,
    reference: p.reference,
    note: p.note,
    receivedAt: p.receivedAt,
    createdAt: p.createdAt,
    ageDays: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / DAY),
    pickup: card?.pickup?.text ?? null,
    destination: card?.destination?.text ?? null,
    buyerName: card?.buyer?.name ?? null,
  };
}

export async function listPayments(userId: string, role: string | undefined, filters: { status?: string; from?: string; to?: string; page?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const cards = await loadMineCards(userId, profile);
  await backfillPayouts(userId, cards);

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  const where: any = { transporterId: userId };
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const all = await prisma.transportPayout.findMany({ where, orderBy: { createdAt: "desc" }, take: 2000 });
  const summary = {
    pending: sumOf(all.filter((p) => p.status === "PENDENTE")),
    received: sumOf(all.filter((p) => p.status === "RECEBIDO")),
    contested: sumOf(all.filter((p) => p.status === "CONTESTADO")),
    overdue: all.filter((p) => p.status === "PENDENTE" && Date.now() - new Date(p.createdAt).getTime() > 3 * DAY).length,
  };

  const list = filters.status && STATUS_VALUES.includes(filters.status) ? all.filter((p) => p.status === filters.status) : all;
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    summary,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => shapePayout(p, cardMap.get(p.deliveryId))),
  };
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

  const updated = await prisma.transportPayout.update({
    where: { id },
    data: { status: "RECEBIDO", method, reference: clean(input?.reference, 60), note: clean(input?.note, 200), receivedAt: new Date() },
  });
  return shapePayout(updated, null);
}

// Reclamar um pagamento que não chegou: fica registado e a equipa é avisada
export async function contestPayout(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const p = await loadPayout(userId, id);

  if (p.status !== "PENDENTE") {
    throw new Error(p.status === "RECEBIDO" ? "Este pagamento já foi confirmado como recebido." : "Este pagamento já foi reclamado.");
  }
  const message = clean(input?.message, 500);
  if (!message || message.length < 10) {
    throw new Error("Explique o que se passou (pelo menos 10 letras).");
  }

  await prisma.transportPayout.update({ where: { id }, data: { status: "CONTESTADO", note: message } });

  try {
    await fileReport(userId, {
      targetType: "DELIVERY",
      targetId: p.deliveryId,
      category: "RECLAMACAO",
      description: `Pagamento do transporte não recebido (${Math.round(p.amount)} FCFA, encomenda ${shortId(p.orderId)}). ${message}`,
    });
  } catch (error) {
    // Se já havia uma denúncia aberta sobre esta entrega, a reclamação fica registada na mesma
  }

  return { id, status: "CONTESTADO" };
}

// =====================================================================
// Despesas do veículo
// =====================================================================
export async function addExpense(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);

  const kind = String(input?.kind ?? "");
  if (!EXPENSE_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de despesa.");
  }
  const amount = Number(String(input?.amount ?? "").replace(",", "."));
  if (isNaN(amount) || amount <= 0 || amount > 100000000) {
    throw new Error("Indique o valor da despesa.");
  }

  const spentAt = input?.spentAt ? parseDay(input.spentAt) : startOfDay(new Date());
  if (!spentAt || spentAt.getTime() > Date.now() + DAY) {
    throw new Error("A data da despesa não pode ser no futuro.");
  }

  let deliveryId: string | null = null;
  if (input?.deliveryId) {
    const d: any = await prisma.delivery.findUnique({ where: { id: String(input.deliveryId) }, select: { id: true, transporterId: true } });
    if (!d || d.transporterId !== userId) {
      throw new Error("Entrega inválida.");
    }
    deliveryId = d.id;
  }

  const receiptUrl = input?.receiptUrl ? String(input.receiptUrl) : null;
  if (receiptUrl && !isStorageUrl(receiptUrl)) {
    throw new Error("Foto do recibo inválida. Envie a foto pelo app.");
  }

  const today = await prisma.transporterExpense.count({ where: { transporterId: userId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (today >= 50) {
    throw new Error("Já registou muitas despesas hoje. Tente amanhã.");
  }

  return prisma.transporterExpense.create({
    data: { transporterId: userId, kind, amount, spentAt, note: clean(input?.note, 200), deliveryId, receiptUrl },
  });
}

export async function listExpenses(userId: string, role: string | undefined, filters: { kind?: string; from?: string; to?: string; page?: number }) {
  assertTransporter(role);

  const from = parseDay(filters.from) ?? startOfMonth(new Date());
  const to = parseDay(filters.to, true) ?? new Date();
  const where: any = { transporterId: userId, spentAt: { gte: from, lte: to } };

  const all = await prisma.transporterExpense.findMany({ where, orderBy: { spentAt: "desc" }, take: 2000 });
  const byKind: Record<string, number> = {};
  all.forEach((e) => (byKind[e.kind] = (byKind[e.kind] ?? 0) + e.amount));

  const list = filters.kind && EXPENSE_VALUES.includes(filters.kind) ? all.filter((e) => e.kind === filters.kind) : all;
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    from,
    to,
    summary: { total: r0(all.reduce((s, e) => s + e.amount, 0)), count: all.length },
    byKind: Object.keys(byKind).map((k) => ({ kind: k, amount: r0(byKind[k]) })).sort((a, b) => b.amount - a.amount),
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function deleteExpense(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);

  const e = await prisma.transporterExpense.findUnique({ where: { id } });
  if (!e || e.transporterId !== userId) {
    throw new Error("Despesa não encontrada.");
  }
  await prisma.transporterExpense.delete({ where: { id } });
  return { id, deleted: true };
}

// =====================================================================
// Relatório financeiro (texto para partilhar)
// =====================================================================
export async function financialReport(userId: string, role: string | undefined, filters: { from?: string; to?: string }) {
  assertTransporter(role);

  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - 29 * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }

  const [user, payouts, expenses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.transportPayout.findMany({ where: { transporterId: userId, createdAt: { gte: from, lte: to } }, take: 3000 }),
    prisma.transporterExpense.findMany({ where: { transporterId: userId, spentAt: { gte: from, lte: to } }, take: 3000 }),
  ]);

  const all = sumOf(payouts);
  const pending = sumOf(payouts.filter((p) => p.status === "PENDENTE"));
  const received = sumOf(payouts.filter((p) => p.status === "RECEBIDO"));
  const contested = sumOf(payouts.filter((p) => p.status === "CONTESTADO"));
  const expensesTotal = r0(expenses.reduce((s, e) => s + e.amount, 0));
  const byKind: Record<string, number> = {};
  expenses.forEach((e) => (byKind[e.kind] = (byKind[e.kind] ?? 0) + e.amount));

  const metrics = {
    deliveries: all.count,
    gross: all.amount,
    commission: all.commission,
    net: all.net,
    received,
    pending,
    contested,
    expenses: expensesTotal,
    expensesByKind: Object.keys(byKind).map((k) => ({ kind: k, label: EXPENSE_KINDS.find((x) => x.value === k)?.label ?? k, amount: r0(byKind[k]) })).sort((a, b) => b.amount - a.amount),
    profit: all.net - expensesTotal,
  };

  const label = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const lines = [
    "RELATÓRIO FINANCEIRO DO TRANSPORTADOR · NÔDJUNTA AGRO",
    `Transportador: ${user?.name ?? "—"}`,
    `Período: ${label(from)} a ${label(to)}`,
    "",
    "GANHOS",
    `- Entregas concluídas: ${metrics.deliveries}`,
    `- Valor dos transportes: ${metrics.gross} FCFA`,
    metrics.commission > 0 ? `- Comissão retida: ${metrics.commission} FCFA` : "",
    `- Ganho líquido: ${metrics.net} FCFA`,
    `- Já recebido: ${received.net} FCFA (${received.count}) · por receber: ${pending.net} FCFA (${pending.count})`,
    contested.count > 0 ? `- Reclamado como não recebido: ${contested.net} FCFA (${contested.count})` : "",
    "",
    "DESPESAS DO VEÍCULO",
    `- Total: ${expensesTotal} FCFA`,
    ...metrics.expensesByKind.map((k) => `- ${k.label}: ${k.amount} FCFA`),
    "",
    `RESULTADO DO PERÍODO: ${metrics.profit} FCFA (ganho líquido menos despesas)`,
    "",
    "Os valores são os registados no app, que não movimenta dinheiro.",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");

  return { from, to, metrics, text: lines.join("\n") };
}
