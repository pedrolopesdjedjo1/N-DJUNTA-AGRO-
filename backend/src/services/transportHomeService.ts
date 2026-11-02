import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { safe } from "../lib/agentScope";
import { assertTransporter, ensureProfile, vehicleReady } from "./transporterService";
import { loadAvailableCards, loadMineCards } from "./transportDeliveryService";
import { getEarningsSummary, startOfDay, startOfMonthOf } from "./transportMoneyService";
import { getReputation } from "./transportReputationService";

const DAY = 86400000;
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };
const SEVERITY_ORDER: Record<string, number> = { EMERGENCIA: 0, ALERTA: 1, ATENCAO: 2, INFO: 3 };
const ROAD_ALERTS = ["CHUVA", "TEMPESTADE", "INUNDACAO", "EMERGENCIA", "OUTRO"];
const STALE_LOCATION_MIN = 30;

// =====================================================================
// Avaliações e reputação
// =====================================================================
export async function getRatings(userId: string, role: string | undefined) {
  assertTransporter(role);
  return getReputation(userId);
}

// =====================================================================
// Ganhos
// =====================================================================
export async function getEarnings(userId: string, role: string | undefined) {
  assertTransporter(role);
  return getEarningsSummary(userId);
}

// =====================================================================
// Início
// =====================================================================
export async function getHome(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [user, mine, available, reputation, earnings, unread, officialAlerts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, photoUrl: true, isVerified: true } }),
    loadMineCards(userId, profile),
    loadAvailableCards(userId, profile),
    getReputation(userId),
    getEarningsSummary(userId),
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
  ]);

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
  const monthStart = startOfMonthOf(now).getTime();
  const ready = vehicleReady(profile);

  // ---------- Alertas importantes ----------
  const alerts: { key: string; level: string; title: string; detail: string; target: { screen: string; id?: string } }[] = [];

  inProgress.forEach((c) => {
    const at = c.lastLocationAt ? new Date(c.lastLocationAt).getTime() : null;
    const minutes = at ? Math.floor((Date.now() - at) / 60000) : null;
    if (profile.shareLocation && (minutes === null || minutes > STALE_LOCATION_MIN)) {
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
      alerts.push({ key: `late-${c.id}`, level: "ALTA", title: `Entrega ${c.orderCode} atrasada`, detail: "A data pretendida já passou e ainda não recolheu os produtos.", target: { screen: "delivery", id: c.id } });
    } else if (due < dayStart + DAY) {
      alerts.push({ key: `today-${c.id}`, level: "MEDIA", title: `Entrega ${c.orderCode} para hoje`, detail: c.pickup.text ? `Recolha em ${c.pickup.text}.` : "Combine a recolha com o vendedor.", target: { screen: "delivery", id: c.id } });
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
      title: profile.vehicleStatus !== "OPERACIONAL" ? "O seu veículo não está operacional" : "Complete o registo do veículo",
      detail:
        profile.vehicleStatus !== "OPERACIONAL"
          ? "Enquanto estiver em manutenção ou avariado, não pode aceitar entregas."
          : "Indique o tipo de veículo e a capacidade de carga para poder aceitar entregas.",
      target: { screen: "vehicle" },
    });
  }

  if (earnings.pending.count > 0 && earnings.pending.oldestAt && Date.now() - new Date(earnings.pending.oldestAt).getTime() > 3 * DAY) {
    alerts.push({
      key: "payouts",
      level: "MEDIA",
      title: `${earnings.pending.count} pagamento(s) por confirmar`,
      detail: `${earnings.pending.amount} FCFA de entregas já concluídas. Se já recebeu, confirme em Ganhos.`,
      target: { screen: "earnings" },
    });
  }

  if (!profile.isAvailable && ready) {
    alerts.push({ key: "unavailable", level: "MEDIA", title: "Está marcado como indisponível", detail: "Ligue a disponibilidade para voltar a aceitar entregas.", target: { screen: "profile" } });
  }

  if (profile.regions.length === 0) {
    alerts.push({ key: "profile", level: "MEDIA", title: "Indique as regiões onde trabalha", detail: "Assim vê as cargas certas e recebe avisos de cargas novas.", target: { screen: "profile" } });
  }

  if (compatible.length > 0 && profile.isAvailable && ready) {
    alerts.push({
      key: "available",
      level: "INFO",
      title: `${compatible.length} carga(s) compatível(eis) com o seu veículo`,
      detail: "Veja os locais de recolha e entrega e aceite as que lhe servem.",
      target: { screen: "available" },
    });
  }

  if (!user?.isVerified) {
    alerts.push({ key: "verification", level: "INFO", title: "Conta ainda não verificada", detail: "A verificação dá mais confiança a quem encomenda.", target: { screen: "verification" } });
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
      plate: profile.plate,
      capacityKg: profile.capacityKg,
      regions: profile.regions.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k),
      badge: reputation.badge,
      rating: { average: reputation.average, count: reputation.count },
    },
    summary: {
      available: compatible.length,
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
      received: earnings.received,
    },
    ratings: { average: reputation.average, count: reputation.count, recent: reputation.recent.slice(0, 3) },
    alerts,
    unreadNotifications: unread,
  };
}
