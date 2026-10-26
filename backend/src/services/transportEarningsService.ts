import { prisma } from "../lib/prisma";
import { safe } from "../lib/agentScope";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";

const DAY = 86400000;
const PAGE_SIZE = 30;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
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

function sumPayout(list: any[]): number {
  return Math.round(list.reduce((s, c) => s + (c.payout ?? 0), 0));
}

// Entregas concluídas dentro do período, da mais recente para a mais antiga
async function completedIn(userId: string, profile: any, from: Date | null, to: Date | null) {
  const cards = await loadMineCards(userId, profile);
  return cards
    .filter((c) => c.phase === "ENTREGUE" && c.deliveredAt)
    .filter((c) => !from || new Date(c.deliveredAt as any).getTime() >= from.getTime())
    .filter((c) => !to || new Date(c.deliveredAt as any).getTime() <= to.getTime())
    .sort((a, b) => new Date(b.deliveredAt as any).getTime() - new Date(a.deliveredAt as any).getTime());
}

// =====================================================================
// Histórico financeiro
// =====================================================================
export async function listEarnings(userId: string, role: string | undefined, filters: { from?: string; to?: string; page?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  const done = await completedIn(userId, profile, from, to);

  const months = new Map<string, { month: string; amount: number; count: number }>();
  done.forEach((c) => {
    const key = monthKey(new Date(c.deliveredAt as any));
    const m = months.get(key) ?? { month: key, amount: 0, count: 0 };
    m.amount += c.payout ?? 0;
    m.count += 1;
    months.set(key, m);
  });

  const amount = sumPayout(done);
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    summary: {
      count: done.length,
      amount,
      average: done.length ? Math.round(amount / done.length) : 0,
      withoutValue: done.filter((c) => !c.payout).length,
    },
    byMonth: Array.from(months.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((m) => ({ ...m, amount: Math.round(m.amount) })),
    total: done.length,
    page,
    pageSize: PAGE_SIZE,
    items: done.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => ({
      id: c.id,
      orderCode: c.orderCode,
      payout: c.payout,
      deliveredAt: c.deliveredAt,
      pickup: c.pickup.text,
      destination: c.destination.text,
      distanceKm: c.distanceKm,
      distanceApprox: c.distanceApprox,
      weightKg: c.weightKg,
      itemsPreview: c.items.slice(0, 2).map((i: any) => i.title),
      itemsCount: c.itemsCount,
      buyerName: c.buyer?.name ?? null,
    })),
  };
}

// =====================================================================
// Relatório de atividade (texto para partilhar)
// =====================================================================
export async function getReport(userId: string, role: string | undefined, filters: { from?: string; to?: string }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const to = parseDay(filters.to, true) ?? new Date();
  const from = parseDay(filters.from) ?? startOfDay(new Date(to.getTime() - 29 * DAY));
  if (from.getTime() > to.getTime()) {
    throw new Error("A data de início deve ser antes da data de fim.");
  }
  const range = { gte: from, lte: to };

  const [user, done, released, problems, reviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    completedIn(userId, profile, from, to),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "DESISTIU", createdAt: range } }),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "PROBLEMA", createdAt: range } }),
    safe(
      "avaliações do período",
      async () => (await prisma.review.findMany({ where: { targetId: userId, createdAt: range }, take: 500 })) as any[],
      [] as any[]
    ),
  ]);

  const amount = sumPayout(done);
  const km = Math.round(done.reduce((s, c) => s + (c.distanceKm ?? 0), 0));
  const weight = Math.round(done.reduce((s, c) => s + (c.weightKg ?? 0), 0));
  const destinations = Array.from(new Set(done.map((c) => c.destination.regionName).filter(Boolean))) as string[];
  const rating = reviews.length ? Math.round((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length) * 10) / 10 : null;

  const metrics = {
    deliveries: done.length,
    amount,
    average: done.length ? Math.round(amount / done.length) : 0,
    km,
    weightKg: weight,
    withoutValue: done.filter((c) => !c.payout).length,
    destinations,
    released,
    problems,
    reviews: reviews.length,
    rating,
  };

  const label = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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
    `- Entregas devolvidas: ${metrics.released} · problemas comunicados: ${metrics.problems}`,
    "",
    "GANHOS",
    `- Total do transporte: ${metrics.amount} FCFA`,
    `- Média por entrega: ${metrics.average} FCFA`,
    metrics.withoutValue > 0 ? `- Entregas sem valor indicado: ${metrics.withoutValue}` : "",
    "",
    "AVALIAÇÕES",
    rating !== null ? `- ${rating} estrelas (${reviews.length} avaliação(ões) no período)` : "- Sem avaliações no período",
    "",
    "Os valores são os do transporte indicado nas encomendas. O app não movimenta dinheiro.",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");

  return { from, to, metrics, text: lines.join("\n") };
}
