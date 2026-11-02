import { prisma } from "../lib/prisma";
import { safe } from "../lib/agentScope";
import { EXPENSE_KINDS } from "../lib/transportMoneyCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";
import { ensurePayouts, financeMetrics, monthKey, pad2, parseDay, periodRange, r0, shapePayout } from "./transportMoneyService";

const PAGE_SIZE = 30;

// =====================================================================
// Histórico financeiro: os pagamentos de cada entrega concluída
// =====================================================================
export async function listEarnings(userId: string, role: string | undefined, filters: { from?: string; to?: string; page?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const cards = await loadMineCards(userId, profile);
  await ensurePayouts(userId, cards);
  const map = new Map(cards.map((c) => [c.id, c]));

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  const where: any = { transporterId: userId };
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const all = await prisma.transportPayout.findMany({ where, orderBy: { createdAt: "desc" }, take: 3000 });

  const months = new Map<string, { month: string; amount: number; net: number; count: number }>();
  all.forEach((p) => {
    const key = monthKey(new Date(p.createdAt));
    const m = months.get(key) ?? { month: key, amount: 0, net: 0, count: 0 };
    m.amount += p.amount;
    m.net += p.netAmount;
    m.count += 1;
    months.set(key, m);
  });

  const amount = r0(all.reduce((s, p) => s + p.amount, 0));
  const net = r0(all.reduce((s, p) => s + p.netAmount, 0));
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    summary: {
      count: all.length,
      amount,
      commission: r0(all.reduce((s, p) => s + p.commissionAmount, 0)),
      net,
      average: all.length ? r0(amount / all.length) : 0,
      withoutValue: cards.filter((c) => c.phase === "ENTREGUE" && !(c.payout && c.payout > 0)).length,
    },
    byMonth: Array.from(months.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((m) => ({ ...m, amount: r0(m.amount), net: r0(m.net) })),
    total: all.length,
    page,
    pageSize: PAGE_SIZE,
    items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => shapePayout(p, map.get(p.deliveryId))),
  };
}

// =====================================================================
// Relatório financeiro e de atividade (texto para partilhar)
// =====================================================================
export async function getReport(userId: string, role: string | undefined, filters: { from?: string; to?: string }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const { from, to } = periodRange(filters, 30);

  const [user, money, cards, released, problems, reviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    financeMetrics(userId, from, to),
    loadMineCards(userId, profile),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "DESISTIU", createdAt: { gte: from, lte: to } } }),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "PROBLEMA", createdAt: { gte: from, lte: to } } }),
    safe(
      "avaliações do período",
      async () => (await prisma.review.findMany({ where: { targetId: userId, createdAt: { gte: from, lte: to } }, take: 500 })) as any[],
      [] as any[]
    ),
  ]);

  const done = cards.filter((c) => c.phase === "ENTREGUE" && c.deliveredAt && new Date(c.deliveredAt) >= from && new Date(c.deliveredAt) <= to);
  const km = r0(done.reduce((s, c) => s + (c.distanceKm ?? 0), 0));
  const weight = r0(done.reduce((s, c) => s + (c.weightKg ?? 0), 0));
  const destinations = Array.from(new Set(done.map((c) => c.destination.regionName).filter(Boolean))) as string[];
  const rating = reviews.length ? Math.round((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length) * 10) / 10 : null;

  const metrics = {
    deliveries: done.length,
    amount: money.gross,
    commission: money.commission,
    net: money.net,
    average: done.length ? r0(money.gross / done.length) : 0,
    received: money.received,
    pending: money.pending,
    contested: money.contested,
    expenses: money.expenses,
    expensesByKind: money.expensesByKind,
    profit: money.profit,
    km,
    weightKg: weight,
    withoutValue: done.filter((c) => !(c.payout && c.payout > 0)).length,
    destinations,
    released,
    problems,
    reviews: reviews.length,
    rating,
  };

  const label = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const kindLabel = (k: string) => EXPENSE_KINDS.find((e) => e.value === k)?.label ?? k;

  const lines = [
    "RELATÓRIO DO TRANSPORTADOR · NÔDJUNTA AGRO",
    `Transportador: ${user?.name ?? "—"}`,
    `Período: ${label(from)} a ${label(to)}`,
    "",
    "ENTREGAS",
    `- Entregas concluídas: ${metrics.deliveries}`,
    `- Quilómetros percorridos (estimados): ${metrics.km}`,
    `- Carga transportada (quilos conhecidos): ${metrics.weightKg}`,
    `- Regiões servidas: ${destinations.length ? destinations.join(", ") : "—"}`,
    `- Entregas canceladas: ${metrics.released} · problemas comunicados: ${metrics.problems}`,
    "",
    "GANHOS",
    `- Valor do transporte: ${metrics.amount} FCFA (média ${metrics.average} FCFA)`,
    metrics.commission > 0 ? `- Comissão: ${metrics.commission} FCFA · a receber depois da comissão: ${metrics.net} FCFA` : "",
    `- Já recebido: ${metrics.received.amount} FCFA (${metrics.received.count}) · por receber: ${metrics.pending.amount} FCFA (${metrics.pending.count})`,
    metrics.contested.count > 0 ? `- Comunicados como não recebidos: ${metrics.contested.amount} FCFA (${metrics.contested.count})` : "",
    metrics.withoutValue > 0 ? `- Entregas sem valor indicado: ${metrics.withoutValue}` : "",
    "",
    "DESPESAS DO VEÍCULO",
    `- Total: ${metrics.expenses} FCFA`,
    ...money.expensesByKind.map((e) => `  · ${kindLabel(e.kind)}: ${e.amount} FCFA`),
    `- Lucro (ganhos menos despesas): ${metrics.profit} FCFA`,
    "",
    "AVALIAÇÕES",
    rating !== null ? `- ${rating} estrelas (${reviews.length} avaliação(ões) no período)` : "- Sem avaliações no período",
    "",
    "Os valores são os do transporte indicado nas encomendas. O app não movimenta dinheiro.",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");

  return { from, to, metrics, text: lines.join("\n") };
}
