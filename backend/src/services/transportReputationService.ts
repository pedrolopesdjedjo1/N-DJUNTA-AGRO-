import { prisma } from "../lib/prisma";
import { safe, clean } from "../lib/agentScope";
import { REPORT_CATEGORIES, REPORT_DECISIONS } from "../lib/adminUserCatalog";
import { badgeOf } from "../lib/transportBusinessCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";

const DAY = 86400000;

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

function firstName(name?: string | null): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "Cliente";
}

// Entregas concluídas há pouco e ainda sem avaliação do comprador ou do vendedor
export async function listToRate(userId: string, role: string | undefined, cardsInput?: any[]) {
  assertTransporter(role);

  const cards = cardsInput ?? (await loadMineCards(userId, await ensureProfile(userId)));
  const since = Date.now() - 30 * DAY;
  const recent = cards.filter((c) => c.phase === "ENTREGUE" && c.deliveredAt && new Date(c.deliveredAt).getTime() >= since).slice(0, 30);
  if (recent.length === 0) return [] as any[];

  const rated = await prisma.partyReview.findMany({ where: { authorId: userId, deliveryId: { in: recent.map((c) => c.id) } } });
  const done = new Set(rated.map((r) => `${r.deliveryId}:${r.targetId}`));

  return recent
    .map((c) => ({
      deliveryId: c.id,
      orderCode: c.orderCode,
      deliveredAt: c.deliveredAt,
      parties: [
        c.buyer?.id ? { party: "BUYER", id: c.buyer.id, name: c.buyer.name, rated: done.has(`${c.id}:${c.buyer.id}`) } : null,
        c.seller?.id ? { party: "SELLER", id: c.seller.id, name: c.seller.name, rated: done.has(`${c.id}:${c.seller.id}`) } : null,
      ].filter(Boolean) as any[],
    }))
    .filter((e) => e.parties.some((p) => !p.rated));
}

// Avaliar o comprador ou o vendedor depois da entrega
export async function rateParty(userId: string, role: string | undefined, deliveryId: string, input: any) {
  assertTransporter(role);

  const d: any = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!d || d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  const order: any = d.orderId ? await prisma.order.findUnique({ where: { id: d.orderId } }) : null;
  if (!order) {
    throw new Error("Encomenda não encontrada.");
  }
  const status = String(d.status).toUpperCase();
  if (!status.includes("ENTREGUE") && !status.includes("CONCLU")) {
    throw new Error("Só pode avaliar depois de concluir a entrega.");
  }

  const party = String(input?.party ?? "");
  if (party !== "BUYER" && party !== "SELLER") {
    throw new Error("Escolha quem quer avaliar.");
  }
  const targetId = party === "BUYER" ? order.buyerId : order.sellerId;

  const rating = Math.floor(Number(input?.rating));
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("Escolha de 1 a 5 estrelas.");
  }

  const exists = await prisma.partyReview.findUnique({ where: { deliveryId_authorId_targetId: { deliveryId, authorId: userId, targetId } } });
  if (exists) {
    throw new Error("Já avaliou esta pessoa nesta entrega.");
  }

  await prisma.partyReview.create({ data: { deliveryId, authorId: userId, targetId, targetRole: party, rating, comment: clean(input?.comment, 300) } });
  return { deliveryId, party, rated: true };
}

// A reputação de um comprador ou vendedor, segundo os transportadores que trabalharam com ele
export async function partyReputation(userId: string, role: string | undefined, partyId: string) {
  assertTransporter(role);

  const mine: any[] = await prisma.delivery.findMany({ where: { transporterId: userId }, select: { orderId: true }, take: 500 });
  const orderIds = mine.map((m) => m.orderId).filter(Boolean);
  const related = orderIds.length
    ? await prisma.order.count({ where: { id: { in: orderIds }, OR: [{ buyerId: partyId }, { sellerId: partyId }] } })
    : 0;
  if (related === 0) {
    throw new Error("Só pode ver a reputação de pessoas com quem trabalhou.");
  }

  const [agg, comments] = await Promise.all([
    prisma.partyReview.aggregate({ where: { targetId: partyId }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.partyReview.findMany({ where: { targetId: partyId, comment: { not: null } }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return {
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count._all,
    comments: comments.map((c) => ({ rating: c.rating, comment: c.comment, createdAt: c.createdAt })),
  };
}

// =====================================================================
// A minha reputação: avaliações, pontualidade, cancelamentos e classificação
// =====================================================================
export async function getReputation(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [reviews, cards, accepted, cancelled] = await Promise.all([
    safe(
      "avaliações",
      async () => (await prisma.review.findMany({ where: { targetId: userId }, orderBy: { createdAt: "desc" }, take: 300 })) as any[],
      [] as any[]
    ),
    loadMineCards(userId, profile),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "ACEITE" } }),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "DESISTIU" } }),
  ]);

  const authorIds = Array.from(new Set(reviews.map((r) => r.authorId).filter(Boolean))) as string[];
  const authors = authorIds.length ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(authors.map((a) => [a.id, firstName(a.name)]));

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  reviews.forEach((r) => {
    const n = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
    distribution[n] += 1;
    sum += Number(r.rating) || 0;
  });
  const average = reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : null;

  const delivered = cards.filter((c) => c.phase === "ENTREGUE");
  const withDate = delivered.filter((c) => c.desiredDate && c.deliveredAt);
  const onTime = withDate.filter((c) => {
    const limit = new Date(c.desiredDate as any);
    limit.setHours(23, 59, 59, 999);
    return new Date(c.deliveredAt as any).getTime() <= limit.getTime();
  });

  const toRate = await listToRate(userId, role, cards);

  return {
    average,
    count: reviews.length,
    distribution,
    recent: reviews.slice(0, 20).map((r) => ({
      id: r.id,
      rating: Number(r.rating) || 0,
      comment: r.comment ?? null,
      authorName: names.get(r.authorId) ?? "Cliente",
      createdAt: r.createdAt,
    })),
    delivered: delivered.length,
    onTimeRate: withDate.length ? Math.round((onTime.length / withDate.length) * 100) : null,
    cancelRate: accepted > 0 ? Math.round((cancelled / accepted) * 100) : null,
    badge: badgeOf(delivered.length, average),
    toRate: toRate.length,
  };
}

// =====================================================================
// As reclamações que recebi (sem dizer quem as fez)
// =====================================================================
export async function complaintsAgainstMe(userId: string, role: string | undefined) {
  assertTransporter(role);

  const rows = await prisma.contentReport.findMany({ where: { reportedUserId: userId }, orderBy: { createdAt: "desc" }, take: 30 });
  const open = rows.filter((r) => r.status === "ABERTA" || r.status === "EM_ANALISE").length;

  return {
    open,
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      categoryLabel: REPORT_CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category,
      status: r.status,
      createdAt: r.createdAt,
      decision: r.decision ? REPORT_DECISIONS.find((d) => d.value === r.decision)?.label ?? r.decision : null,
      decidedAt: r.decidedAt,
      orderCode: r.targetType === "ORDER" || r.targetType === "DELIVERY" ? shortId(r.targetId) : null,
    })),
  };
}
