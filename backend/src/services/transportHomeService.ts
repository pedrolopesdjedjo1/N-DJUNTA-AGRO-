import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { safe } from "../lib/agentScope";
import { assertTransporter, ensureProfile, shapeDocuments, vehicleReady } from "./transporterService";
import { loadAvailableCards, loadMineCards } from "./transportDeliveryService";
import { getFinance } from "./transportFinanceService";
import { getReputation, listToRate } from "./transportReputationService";

const DAY = 86400000;
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };
const SEVERITY_ORDER: Record<string, number> = { EMERGENCIA: 0, ALERTA: 1, ATENCAO: 2, INFO: 3 };
const ROAD_ALERTS = ["CHUVA", "TEMPESTADE", "INUNDACAO", "EMERGENCIA", "OUTRO"];
const STALE_LOCATION_MIN = 30;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

// Avaliações recebidas e reputação
export async function getRatings(userId: string, role: string | undefined) {
  return getReputation(userId, role);
}

// Ganhos (com o que está por receber)
export async function getEarnings(userId: string, role: string | undefined) {
  return getFinance(userId, role);
}

// =====================================================================
// Início
// =====================================================================
export async function getHome(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [user, mine, available, ratings, earnings, unread, officialAlerts, documents, myOffers] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, photoUrl: true, isVerified: true } }),
    loadMineCards(userId, profile),
    loadAvailableCards(userId, profile),
    getReputation(userId, role),
    getFinance(userId, role),
    prisma.notification.count({ where: { userId, isRead: false } }),
    safe(
      "alertas oficiais",
      async () => {
        const now = new Date();
        const rows = await prisma.officialAlert.findMany({
          where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          select: { id: true, title: true, severity: true, kind: true, regions: true },
          take: 100,
        });
        return rows
          .filter((a) => ROAD_ALERTS.includes(a.kind))
          .filter((a) => a.regions.length === 0 || profile.regions.length === 0 || a.regions.some((r) => profile.regions.includes(r)))
          .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
          .slice(0, 3);
      },
      [] as any[]
    ),
    prisma.transporterDocument.findMany({ where: { transporterId: userId } }),
    prisma.transportOffer.findMany({ where: { transporterId: userId, status: "ATIVA" }, select: { id: true } }),
  ]);

  const pendingRequests = myOffers.length
    ? await prisma.transportRequest.count({ where: { offerId: { in: myOffers.map((o) => o.id) }, status: "PENDENTE" } })
    : 0;
  const overduePayouts = await prisma.transportPayout.count({ where: { transporterId: userId, status: "PENDENTE", createdAt: { lt: new Date(Date.now() - 3 * DAY) } } });

  const matching = available.filter((c) => c.matchesMyRegions);
  const compatible = matching.filter((c) => c.compatibility.ok);
  const inProgress = mine.filter((c) => c.phase === "EM_TRANSPORTE");
  const upcoming = mine
    .filter((c) => c.phase === "ACEITE")
    .sort(
      (a, b) =>
        (a.desiredDate ? new Date(a.desiredDate).getTime() : Number.MAX_SAFE_INTEGER) -
        (b.desiredDate ? new Date(b.desiredDate).getTime() : Number.MAX_SAFE_INTEGER)
    );
  const completed = mine
    .filter((c) => c.phase === "ENTREGUE")
    .sort((a, b) => new Date(b.deliveredAt ?? 0).getTime() - new Date(a.deliveredAt ?? 0).getTime());

  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  const ready = vehicleReady(profile);

  // ---------- Alertas importantes ----------
  const alerts: { key: string; level: string; title: string; detail: string; target: { screen: string; id?: string } }[] = [];

  inProgress.forEach((c) => {
    const at = c.lastLocationAt ? new Date(c.lastLocationAt).getTime() : null;
    const minutes = at ? Math.floor((Date.now() - at) / 60000) : null;
    if ((minutes === null || minutes > STALE_LOCATION_MIN) && profile.shareLocation) {
      alerts.push({
        key: `location-${c.id}`,
        level: "ALTA",
        title: `Partilhe a localização da entrega ${c.orderCode}`,
        detail: minutes === null ? "Ainda não partilhou onde está. O comprador está à espera." : `Sem localização há ${minutes} minutos.`,
        target: { screen: "delivery", id: c.id },
      });
    }
  });

  upcoming.forEach((c) => {
    if (!c.desiredDate) return;
    const due = new Date(c.desiredDate).getTime();
    if (due < dayStart) {
      alerts.push({
        key: `late-${c.id}`,
        level: "ALTA",
        title: `Entrega ${c.orderCode} atrasada`,
        detail: "A data pretendida já passou e ainda não recolheu os produtos.",
        target: { screen: "delivery", id: c.id },
      });
    } else if (due < dayStart + DAY) {
      alerts.push({
        key: `today-${c.id}`,
        level: "MEDIA",
        title: `Entrega ${c.orderCode} para hoje`,
        detail: c.pickup.text ? `Recolha em ${c.pickup.text}.` : "Combine a recolha com o vendedor.",
        target: { screen: "delivery", id: c.id },
      });
    }
  });

  officialAlerts.forEach((a: any) => {
    alerts.push({
      key: `official-${a.id}`,
      level: a.severity === "EMERGENCIA" || a.severity === "ALERTA" ? "ALTA" : "MEDIA",
      title: `Alerta oficial: ${a.title}`,
      detail: "Pode afetar as estradas e as entregas da sua região.",
      target: { screen: "alert", id: a.id },
    });
  });

  if (!ready) {
    alerts.push({
      key: "vehicle",
      level: "ALTA",
      title: "O seu veículo não está pronto para aceitar entregas",
      detail: !profile.vehicleType
        ? "Registe o seu veículo."
        : !profile.capacityKg
        ? "Indique a capacidade de carga em quilos."
        : "O veículo está em manutenção ou avariado. Volte a pô-lo operacional quando estiver pronto.",
      target: { screen: "vehicle" },
    });
  }

  const docs = shapeDocuments(documents).filter((d) => d.forVehicle || d.kind === "CARTA_CONDUCAO");
  docs
    .filter((d) => d.expired || d.expiringSoon)
    .forEach((d) => {
      alerts.push({
        key: `doc-${d.id}`,
        level: d.expired ? "ALTA" : "MEDIA",
        title: d.expired ? `Documento fora do prazo: ${d.name}` : `Documento a terminar: ${d.name}`,
        detail: "Renove-o para continuar verificado.",
        target: { screen: "vehicle" },
      });
    });

  if (!profile.isAvailable && ready) {
    alerts.push({
      key: "unavailable",
      level: "MEDIA",
      title: "Está marcado como indisponível",
      detail: "Ligue a disponibilidade para voltar a aceitar entregas.",
      target: { screen: "profile" },
    });
  }

  if (!profile.vehicleType || profile.regions.length === 0) {
    alerts.push({
      key: "profile",
      level: "MEDIA",
      title: "Complete o perfil de transportador",
      detail: "Indique o veículo e as regiões onde trabalha para ver as entregas certas.",
      target: { screen: "profile" },
    });
  }

  if (overduePayouts > 0) {
    alerts.push({
      key: "payouts",
      level: "MEDIA",
      title: `${overduePayouts} pagamento(s) por receber há mais de 3 dias`,
      detail: "Confirme em Ganhos os que já recebeu, ou reclame os que não chegaram.",
      target: { screen: "payments" },
    });
  }

  if (pendingRequests > 0) {
    alerts.push({
      key: "requests",
      level: "INFO",
      title: `${pendingRequests} pedido(s) de transporte nas suas ofertas`,
      detail: "Pessoas querem transportar nas suas viagens. Responda.",
      target: { screen: "requests" },
    });
  }

  if (ratings.toRate > 0) {
    alerts.push({
      key: "rate",
      level: "INFO",
      title: `${ratings.toRate} entrega(s) por avaliar`,
      detail: "Avalie os compradores e vendedores das entregas que concluiu.",
      target: { screen: "rate" },
    });
  }

  if (compatible.length > 0 && profile.isAvailable && ready) {
    alerts.push({
      key: "available",
      level: "INFO",
      title: `${compatible.length} carga(s) nova(s) que servem ao seu veículo`,
      detail: "Veja os locais de recolha e entrega e aceite as que lhe servem.",
      target: { screen: "available" },
    });
  }

  if (!user?.isVerified) {
    alerts.push({
      key: "verification",
      level: "INFO",
      title: "Conta ainda não verificada",
      detail: "A verificação dá mais confiança a quem encomenda.",
      target: { screen: "verification" },
    });
  }

  alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return {
    transporter: {
      name: user?.name ?? "",
      photoUrl: user?.photoUrl ?? null,
      isVerified: !!user?.isVerified,
      isAvailable: profile.isAvailable,
      vehicleType: profile.vehicleType,
      vehicleStatus: profile.vehicleStatus,
      vehicleReady: ready,
      transporterKind: profile.transporterKind,
      plate: profile.plate,
      capacityKg: profile.capacityKg,
      regions: profile.regions.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k),
      rating: { average: ratings.average, count: ratings.count },
      badge: ratings.badge,
    },
    summary: {
      available: matching.length,
      availableCompatible: compatible.length,
      availableAll: available.length,
      inProgress: inProgress.length,
      upcoming: upcoming.length,
      completed: completed.length,
      completedToday: completed.filter((c) => new Date(c.deliveredAt as any).getTime() >= dayStart).length,
      completedMonth: completed.filter((c) => new Date(c.deliveredAt as any).getTime() >= monthStart).length,
    },
    availablePreview: compatible.slice(0, 5),
    inProgress: inProgress.slice(0, 5),
    upcoming: upcoming.slice(0, 5),
    recentCompleted: completed.slice(0, 3),
    earnings: {
      today: earnings.today,
      week: earnings.week,
      month: earnings.month,
      pending: earnings.pending,
      profitMonth: earnings.profitMonth,
    },
    ratings: { average: ratings.average, count: ratings.count, recent: ratings.recent.slice(0, 3), badge: ratings.badge },
    alerts,
    unreadNotifications: unread,
  };
}
