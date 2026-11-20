import { prisma } from "../lib/prisma";
import { EXPENSE_KINDS } from "../lib/transportMoneyCatalog";

const DAY = 86400000;

// ---------- Pequenas ajudas de datas e números ----------
export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function r0(n: number) {
  return Math.round(n);
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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

// Período pedido (ou os últimos "defaultDays" dias)
export function periodRange(filters: { from?: string; to?: string }, defaultDays = 30) {
  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - (defaultDays - 1) * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }
  return { from, to };
}

// ---------- Pagamentos de cada entrega concluída ----------
// As entregas concluídas antes deste registo ganham o seu valor por receber (últimos 30 dias)
// ou já recebido (as mais antigas), para o histórico não ficar vazio.
const backfilled = new Map<string, number>();

export async function ensurePayouts(userId: string, cards: any[]) {
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

export function shapePayout(p: any, card: any) {
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

function sumOf(rows: any[]) {
  return {
    amount: r0(rows.reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    net: r0(rows.reduce((s, p) => s + (Number(p.netAmount) || 0), 0)),
    commission: r0(rows.reduce((s, p) => s + (Number(p.commissionAmount) || 0), 0)),
    count: rows.length,
  };
}

// ---------- Números do período: ganhos, recebido, por receber, despesas e lucro ----------
export async function financeMetrics(userId: string, from: Date, to: Date) {
  const [payouts, expenses] = await Promise.all([
    prisma.transportPayout.findMany({ where: { transporterId: userId, createdAt: { gte: from, lte: to } }, take: 3000 }),
    prisma.transporterExpense.findMany({ where: { transporterId: userId, spentAt: { gte: from, lte: to } }, take: 3000 }),
  ]);

  const all = sumOf(payouts);
  const received = sumOf(payouts.filter((p) => p.status === "RECEBIDO"));
  const pending = sumOf(payouts.filter((p) => p.status === "PENDENTE"));
  const contested = sumOf(payouts.filter((p) => p.status === "CONTESTADO"));

  const expensesTotal = r0(expenses.reduce((s, e) => s + e.amount, 0));
  const byKind: Record<string, number> = {};
  expenses.forEach((e) => (byKind[e.kind] = (byKind[e.kind] ?? 0) + e.amount));

  return {
    gross: all.amount,
    commission: all.commission,
    net: all.net,
    received,
    pending,
    contested,
    expenses: expensesTotal,
    expensesByKind: Object.keys(byKind)
      .map((k) => ({
        kind: k,
        label: EXPENSE_KINDS.find((x) => x.value === k)?.label ?? k,
        amount: r0(byKind[k]),
      }))
      .sort((a, b) => b.amount - a.amount),
    profit: all.net - expensesTotal,
  };
}
