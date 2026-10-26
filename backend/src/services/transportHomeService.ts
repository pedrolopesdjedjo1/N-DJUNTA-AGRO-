import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { safe } from "../lib/agentScope";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadAvailableCards, loadMineCards } from "./transportDeliveryService";

const DAY = 86400000;
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };
const SEVERITY_ORDER: Record<string, number> = { EMERGENCIA: 0, ALERTA: 1, ATENCAO: 2, INFO: 3 };
const ROAD_ALERTS = ["CHUVA", "TEMPESTADE", "INUNDACAO", "EMERGENCIA", "OUTRO"];
const STALE_LOCATION_MIN = 30;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(d: Date) {
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

// =====================================================================
// Avaliações recebidas
// =====================================================================
export async function getRatings(userId: string, role: string | undefined) {
  assertTransporter(role);

  const reviews: any[] = await safe(
    "avaliações",
    async () => (await prisma.review.findMany({ where: { targetId: userId }, orderBy: { createdAt: "desc" }, take: 200 })) as any[],
    [] as any[]
  );

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

  return {
    average: reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : null,
    count: reviews.length,
    distribution,
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
// Ganhos (valor de transporte das entregas concluídas)
// =====================================================================
export async function getEarnings(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const cards = await loadMineCards(userId, profile);
  const done = cards.filter((c) => c.phase === "ENTREGUE" && c.deliveredAt);

  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  const range = (from: number) => {
    const list = done.filter((c) => new Date(c.deliveredAt as any).getTime() >= from);
    return { amount: Math.round(list.reduce((s, c) => s + (c.payout ?? 0), 0)), count: list.length };
  };

  const byDay: { date: string; amount: number; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * DAY));
    const key = dateKey(day);
    const list = done.filter((c) => dateKey(new Date(c.deliveredAt as any)) === key);
    byDay.push({ date: key, amount: Math.round(list.reduce((s, c) => s + (c.payout ?? 0), 0)), count: list.length });
  }

  const recent = [...done]
    .sort((a, b) => new Date(b.deliveredAt as any).getTime() - new Date(a.deliveredAt as any).getTime())
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      orderCode: c.orderCode,
      payout: c.payout,
      deliveredAt: c.deliveredAt,
      pickup: c.pickup.text,
      destination: c.destination.text,
    }));

  return {
    today: range(dayStart),
    week: range(weekStart),
    month: range(monthStart),
    total: { amount: Math.round(done.reduce((s, c) => s + (c.payout ?? 0), 0)), count: done.length },
    withoutValue: done.filter((c) => c.payout === null || c.payout === 0).length,
    byDay,
    recent,
    note: "O valor de cada entrega é o transporte indicado na encomenda. O app não movimenta dinheiro: o pagamento combina-se com quem encomenda.",
  };
}

// =====================================================================
// Início
// =====================================================================
export async function getHome(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [user, mine, available, ratings, earnings, unread, officialAlerts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, photoUrl: true, isVerified: true } }),
    loadMineCards(userId, profile),
    loadAvailableCards(userId, profile),
    getRatings(userId, role),
    getEarnings(userId, role),
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

  // ---------- Alertas importantes ----------
  const alerts: { key: string; level: string; title: string; detail: string; target: { screen: string; id?: string } }[] = [];

  inProgress.forEach((c) => {
    const at = c.lastLocationAt ? new Date(c.lastLocationAt).getTime() : null;
    const minutes = at ? Math.floor((Date.now() - at) / 60000) : null;
    if (minutes === null || minutes > STALE_LOCATION_MIN) {
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

  if (!profile.isAvailable) {
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

  if (matching.length > 0 && profile.isAvailable) {
    alerts.push({
      key: "available",
      level: "INFO",
      title: `${matching.length} entrega(s) nova(s) disponível(eis)`,
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
      plate: profile.plate,
      capacityKg: profile.capacityKg,
      regions: profile.regions.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k),
      rating: { average: ratings.average, count: ratings.count },
    },
    summary: {
      available: matching.length,
      availableAll: available.length,
      inProgress: inProgress.length,
      upcoming: upcoming.length,
      completed: completed.length,
      completedToday: completed.filter((c) => new Date(c.deliveredAt as any).getTime() >= dayStart).length,
      completedMonth: completed.filter((c) => new Date(c.deliveredAt as any).getTime() >= monthStart).length,
    },
    availablePreview: matching.slice(0, 5),
    inProgress: inProgress.slice(0, 5),
    upcoming: upcoming.slice(0, 5),
    recentCompleted: completed.slice(0, 3),
    earnings: { today: earnings.today, week: earnings.week, month: earnings.month },
    ratings: { average: ratings.average, count: ratings.count, recent: ratings.recent.slice(0, 3) },
    alerts,
    unreadNotifications: unread,
  };
}
