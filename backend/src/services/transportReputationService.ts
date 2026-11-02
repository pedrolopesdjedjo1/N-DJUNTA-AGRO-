import { prisma } from "../lib/prisma";
import { clean, safe } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { PARTY_SIDES } from "../lib/transportMoneyCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";

const SIDE_VALUES = values(PARTY_SIDES);

function endOfDay(value: any): number {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function badgeOf(delivered: number, average: number | null, cancelRate: number, onTimeRate: number | null): string {
  if (delivered >= 30 && (average ?? 0) >= 4.5 && cancelRate <= 10) return "EXCELENTE";
  if (delivered >= 10 && (average === null ? (onTimeRate ?? 100) >= 80 : average >= 4)) return "CONFIAVEL";
  return "NOVO";
}

// =====================================================================
// Reputação do transportador
// =====================================================================
export async function getReputation(userId: string) {
  const profile = await ensureProfile(userId);

  const [reviews, delivered, cancelled, accepted, problems, cards] = await Promise.all([
    safe(
      "avaliações",
      async () => (await prisma.review.findMany({ where: { targetId: userId }, orderBy: { createdAt: "desc" }, take: 500 })) as any[],
      [] as any[]
    ),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "ENTREGUE" } }),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "DESISTIU" } }),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "ACEITE" } }),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "PROBLEMA" } }),
    loadMineCards(userId, profile),
  ]);

  const authorIds = Array.from(new Set(reviews.map((r) => r.authorId).filter(Boolean))) as string[];
  const authors = authorIds.length ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(authors.map((a) => [a.id, String(a.name).trim().split(/\s+/)[0]]));

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  reviews.forEach((r) => {
    const n = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
    distribution[n] += 1;
    sum += Number(r.rating) || 0;
  });
  const average = reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : null;

  // Entregas à hora: concluídas até ao fim do dia pretendido
  const dated = cards.filter((c) => c.phase === "ENTREGUE" && c.desiredDate && c.deliveredAt);
  const onTime = dated.filter((c) => new Date(c.deliveredAt).getTime() <= endOfDay(c.desiredDate)).length;
  const onTimeRate = dated.length ? Math.round((onTime / dated.length) * 100) : null;
  const cancelRate = accepted > 0 ? Math.round((cancelled / accepted) * 100) : 0;

  return {
    average,
    count: reviews.length,
    distribution,
    badge: badgeOf(delivered, average, cancelRate, onTimeRate),
    stats: { delivered, cancelled, accepted, problems, cancelRate, onTimeRate },
    recent: reviews.slice(0, 20).map((r) => ({
      id: r.id,
      rating: Number(r.rating) || 0,
      comment: r.comment ?? null,
      authorName: names.get(r.authorId) ?? "Cliente",
      createdAt: r.createdAt,
    })),
  };
}

// =====================================================================
// Avaliar o comprador e o vendedor
// =====================================================================
async function scoresOf(ids: string[]) {
  if (ids.length === 0) return new Map<string, { average: number | null; count: number }>();
  const rows = await prisma.partyReview.groupBy({ by: ["targetId"], where: { targetId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.targetId, { average: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, count: r._count._all }]));
}

// O comprador e o vendedor de uma entrega: a avaliação que tiveram de outros transportadores e a minha
export async function deliveryParties(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);

  const d: any = await prisma.delivery.findUnique({ where: { id } });
  if (!d || d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  const order: any = d.orderId ? await prisma.order.findUnique({ where: { id: d.orderId } }) : null;
  if (!order) {
    throw new Error("A encomenda desta entrega não foi encontrada.");
  }

  const ids = [order.buyerId, order.sellerId] as string[];
  const [users, scores, mine] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, isVerified: true } }),
    scoresOf(ids),
    prisma.partyReview.findMany({ where: { deliveryId: id, authorId: userId } }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const delivered = await prisma.deliveryEvent.findFirst({ where: { deliveryId: id, kind: "ENTREGUE" } });
  const side = (partyId: string) => {
    const u = userMap.get(partyId);
    const given = mine.find((m) => m.targetId === partyId);
    return {
      id: partyId,
      name: u?.name ?? "Utilizador",
      isVerified: !!u?.isVerified,
      score: scores.get(partyId) ?? { average: null, count: 0 },
      myRating: given ? { rating: given.rating, comment: given.comment } : null,
    };
  };

  return { canRate: !!delivered, buyer: side(order.buyerId), seller: side(order.sellerId) };
}

export async function rateParty(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);

  const side = String(input?.side ?? "");
  if (!SIDE_VALUES.includes(side)) {
    throw new Error("Escolha quem quer avaliar.");
  }
  const rating = Math.floor(Number(input?.rating));
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("Escolha de 1 a 5 estrelas.");
  }

  const d: any = input?.deliveryId ? await prisma.delivery.findUnique({ where: { id: String(input.deliveryId) } }) : null;
  if (!d || d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (!(await prisma.deliveryEvent.findFirst({ where: { deliveryId: d.id, kind: "ENTREGUE" } }))) {
    throw new Error("Só pode avaliar depois de concluir a entrega.");
  }

  const order: any = d.orderId ? await prisma.order.findUnique({ where: { id: d.orderId } }) : null;
  const targetId = side === "BUYER" ? order?.buyerId : order?.sellerId;
  if (!targetId) {
    throw new Error("Pessoa não encontrada.");
  }

  const comment = clean(input?.comment, 300);
  await prisma.partyReview.upsert({
    where: { deliveryId_authorId_targetId: { deliveryId: d.id, authorId: userId, targetId } },
    create: { deliveryId: d.id, authorId: userId, targetId, side, rating, comment },
    update: { rating, comment },
  });

  return deliveryParties(userId, role, d.id);
}

// =====================================================================
// Reclamações recebidas (sem dizer quem denunciou nem o que escreveu)
// =====================================================================
export async function receivedComplaints(userId: string, role: string | undefined) {
  assertTransporter(role);

  const rows = await prisma.contentReport.findMany({ where: { reportedUserId: userId }, orderBy: { createdAt: "desc" }, take: 50 });
  const open = rows.filter((r) => r.status === "ABERTA" || r.status === "EM_ANALISE").length;

  return {
    summary: { total: rows.length, open, decided: rows.length - open },
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      targetType: r.targetType,
      status: r.status,
      createdAt: r.createdAt,
      decision: r.decision,
      decisionNote: r.status === "RESOLVIDA" || r.status === "ARQUIVADA" ? r.decisionNote : null,
      decidedAt: r.decidedAt,
    })),
    note: "Por privacidade, não mostramos quem fez a reclamação nem o que escreveu. Se discorda de uma decisão, fale com o suporte.",
  };
}
