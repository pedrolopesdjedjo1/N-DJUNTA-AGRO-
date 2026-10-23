import { prisma } from "../lib/prisma";
import { ORDER_CLOSED } from "../lib/agentCatalog";
import { assertAgent, ensureProfile, ratingOf } from "./agentService";

const DAY = 86400000;
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };
const SEVERITY_ORDER: Record<string, number> = { EMERGENCIA: 0, ALERTA: 1, ATENCAO: 2, INFO: 3 };
const ATTEND_KINDS = ["CONTACTO", "VISITA", "ATENDIMENTO", "ASSISTENCIA_INICIADA"];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function safe<T>(label: string, work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.error(`agentHome: ${label}`, error);
    return fallback;
  }
}

export async function getHome(agentId: string, role?: string) {
  assertAgent(role);
  const profile = await ensureProfile(agentId);

  const now = new Date();
  const month = new Date(now.getTime() - 30 * DAY);
  const today = startOfToday();
  const tomorrow = new Date(today.getTime() + DAY);

  const [user, links, pendingTasks, activities, sessions, unread, needsOpen, referrals30, attended, rating] = await Promise.all([
    prisma.user.findUnique({ where: { id: agentId }, select: { name: true, isVerified: true, photoUrl: true } }),
    prisma.agentClient.findMany({ where: { agentId }, select: { id: true, clientId: true, status: true, createdAt: true, consentAt: true } }),
    prisma.agentTask.findMany({ where: { agentId, status: "PENDENTE" }, take: 400 }),
    prisma.agentActivity.findMany({ where: { agentId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.agentSession.findMany({ where: { agentId, endedAt: null, expiresAt: { gt: now } }, orderBy: { startedAt: "desc" } }),
    prisma.notification.count({ where: { userId: agentId, isRead: false } }),
    prisma.agentNeed.count({ where: { agentId, status: "IDENTIFICADA" } }),
    prisma.agentActivity.count({ where: { agentId, kind: "OPORTUNIDADE", createdAt: { gte: month } } }),
    prisma.agentActivity.findMany({
      where: { agentId, kind: { in: ATTEND_KINDS }, createdAt: { gte: month }, NOT: { clientId: null } },
      select: { clientId: true },
      take: 3000,
    }),
    ratingOf(agentId),
  ]);

  const active = links.filter((l) => l.status === "ATIVO");
  const activeIds = active.map((l) => l.clientId);
  const pendingInvites = links.filter((l) => l.status === "PENDENTE_ACEITACAO");

  // Clientes sem contacto há mais de 30 dias
  const lastActs = activeIds.length
    ? await prisma.agentActivity.groupBy({ by: ["clientId"], where: { agentId, clientId: { in: activeIds } }, _max: { createdAt: true } })
    : [];
  const lastMap = new Map(lastActs.map((a) => [a.clientId, a._max.createdAt]));
  const silent = active.filter((l) => {
    const last = lastMap.get(l.clientId);
    const since = last ?? l.consentAt ?? l.createdAt;
    return new Date(since).getTime() < month.getTime();
  });

  // Encomendas e negócios dos clientes
  const orders = await safe(
    "encomendas",
    async () => {
      if (activeIds.length === 0) return { open: 0, stale: 0, byStatus: {} as Record<string, number>, completed30: 0, value30: 0 };

      const rows = await prisma.order.findMany({
        where: { OR: [{ buyerId: { in: activeIds } }, { sellerId: { in: activeIds } }] },
        select: { id: true, status: true, total: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });

      const byStatus: Record<string, number> = {};
      let open = 0;
      let stale = 0;
      let completed30 = 0;
      let value30 = 0;

      rows.forEach((o) => {
        const status = String(o.status);
        if (!ORDER_CLOSED.includes(status)) {
          open += 1;
          byStatus[status] = (byStatus[status] ?? 0) + 1;
          if (new Date(o.createdAt).getTime() < now.getTime() - 3 * DAY) stale += 1;
        } else if (status === "CONCLUIDO" && new Date(o.updatedAt).getTime() >= month.getTime()) {
          completed30 += 1;
          value30 += Number(o.total) || 0;
        }
      });

      return { open, stale, byStatus, completed30, value30: Math.round(value30) };
    },
    { open: 0, stale: 0, byStatus: {} as Record<string, number>, completed30: 0, value30: 0 }
  );

  const openOpportunities = await safe("oportunidades", () => prisma.opportunity.count({ where: { status: "ABERTA" } }), 0);

  // Alertas oficiais ativos nas regiões do agente
  const officialAlerts = await safe(
    "alertas oficiais",
    async () => {
      const rows = await prisma.officialAlert.findMany({
        where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, title: true, severity: true, kind: true, regions: true },
        take: 100,
      });
      return rows
        .filter((a) => a.regions.length === 0 || a.regions.some((r) => profile.regions.includes(r)))
        .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
        .slice(0, 3);
    },
    [] as any[]
  );

  // Tarefas
  const dueOf = (t: any) => (t.dueDate ? new Date(t.dueDate).getTime() : null);
  const overdue = pendingTasks.filter((t) => dueOf(t) !== null && (dueOf(t) as number) < today.getTime());
  const dueToday = pendingTasks.filter((t) => dueOf(t) !== null && (dueOf(t) as number) >= today.getTime() && (dueOf(t) as number) < tomorrow.getTime());

  const taskList = [...pendingTasks]
    .sort((a, b) => {
      const pa = a.priority === "ALTA" ? 0 : 1;
      const pb = b.priority === "ALTA" ? 0 : 1;
      const da = dueOf(a) ?? Number.MAX_SAFE_INTEGER;
      const db = dueOf(b) ?? Number.MAX_SAFE_INTEGER;
      return da - db || pa - pb;
    })
    .slice(0, 5);

  // Nomes dos clientes (tarefas, atividades, sessões)
  const nameIds = Array.from(
    new Set([...taskList.map((t) => t.clientId), ...activities.map((a) => a.clientId), ...sessions.map((s) => s.clientId)].filter(Boolean))
  ) as string[];
  const named = nameIds.length ? await prisma.user.findMany({ where: { id: { in: nameIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(named.map((u) => [u.id, u.name]));

  // ---------- Alertas importantes ----------
  const alerts: { key: string; level: string; title: string; detail: string; target: { screen: string; id?: string } }[] = [];

  if (profile.status !== "APROVADO") {
    alerts.push({
      key: "profile",
      level: profile.status === "SUSPENSO" || profile.status === "RECUSADO" ? "ALTA" : "MEDIA",
      title:
        profile.status === "PENDENTE"
          ? "Perfil de agente em análise"
          : profile.status === "SUSPENSO"
          ? "Conta de agente suspensa"
          : profile.status === "RECUSADO"
          ? "Perfil de agente recusado"
          : "Complete o perfil de agente",
      detail:
        profile.status === "PENDENTE"
          ? "A equipa do NÔDJUNTA AGRO está a analisar os seus dados."
          : profile.statusNote
          ? `Motivo: ${profile.statusNote}`
          : "Só depois de aprovado pode registar pessoas e ajudar nas contas.",
      target: { screen: "profile" },
    });
  }

  if (sessions.length > 0) {
    alerts.push({
      key: "session",
      level: "INFO",
      title: `Sessão de ajuda aberta com ${names.get(sessions[0].clientId) ?? "um cliente"}`,
      detail: "Termine a sessão quando acabar de ajudar.",
      target: { screen: "session", id: sessions[0].id },
    });
  }

  if (overdue.length > 0) {
    alerts.push({
      key: "tasks-overdue",
      level: "ALTA",
      title: `${overdue.length} tarefa(s) atrasada(s)`,
      detail: overdue[0].title,
      target: { screen: "tasks" },
    });
  }

  if (dueToday.length > 0) {
    alerts.push({
      key: "tasks-today",
      level: "MEDIA",
      title: `${dueToday.length} tarefa(s) para hoje`,
      detail: dueToday[0].title,
      target: { screen: "tasks" },
    });
  }

  if (orders.stale > 0) {
    alerts.push({
      key: "orders-stale",
      level: "MEDIA",
      title: `${orders.stale} encomenda(s) parada(s) há mais de 3 dias`,
      detail: "Encomendas dos seus clientes que ainda não foram concluídas.",
      target: { screen: "orders" },
    });
  }

  officialAlerts.forEach((a: any) => {
    alerts.push({
      key: `official-${a.id}`,
      level: a.severity === "EMERGENCIA" || a.severity === "ALERTA" ? "ALTA" : "MEDIA",
      title: `Alerta oficial: ${a.title}`,
      detail: "Avise os seus clientes da região.",
      target: { screen: "alert", id: a.id },
    });
  });

  const oldInvites = pendingInvites.filter((l) => new Date(l.createdAt).getTime() < now.getTime() - 3 * DAY);
  if (oldInvites.length > 0) {
    alerts.push({
      key: "invites",
      level: "INFO",
      title: `${oldInvites.length} convite(s) sem resposta há mais de 3 dias`,
      detail: "Fale com as pessoas para aceitarem o convite.",
      target: { screen: "clients" },
    });
  }

  if (silent.length > 0) {
    alerts.push({
      key: "silent",
      level: "INFO",
      title: `${silent.length} cliente(s) sem contacto há mais de 30 dias`,
      detail: "Que tal perguntar como estão?",
      target: { screen: "clients" },
    });
  }

  alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return {
    agent: {
      name: user?.name ?? "",
      photoUrl: user?.photoUrl ?? null,
      isVerified: !!user?.isVerified,
      status: profile.status,
      agentType: profile.agentType,
      canRegister: profile.canRegister,
      canAssist: profile.canAssist,
      commissionRate: profile.commissionRate,
      rating,
    },
    people: {
      activeClients: active.length,
      pendingInvites: pendingInvites.length,
      newThisMonth: active.filter((l) => new Date(l.consentAt ?? l.createdAt).getTime() >= month.getTime()).length,
      attendedThisMonth: new Set(attended.map((a) => a.clientId)).size,
      silent: silent.length,
    },
    orders,
    opportunities: { open: openOpportunities, referredThisMonth: referrals30 },
    tasks: {
      pending: pendingTasks.length,
      overdue: overdue.length,
      today: dueToday.length,
      list: taskList.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        kind: t.kind,
        clientName: t.clientId ? names.get(t.clientId) ?? null : null,
        overdue: dueOf(t) !== null && (dueOf(t) as number) < today.getTime(),
      })),
    },
    needs: { open: needsOpen },
    commission: { rate: profile.commissionRate },
    alerts,
    activeSessions: sessions.map((s) => ({
      id: s.id,
      clientId: s.clientId,
      clientName: names.get(s.clientId) ?? null,
      expiresAt: s.expiresAt,
      startedAt: s.startedAt,
    })),
    recentActivities: activities.map((a) => ({
      id: a.id,
      kind: a.kind,
      message: a.message,
      clientName: a.clientId ? names.get(a.clientId) ?? null : null,
      createdAt: a.createdAt,
    })),
    unreadNotifications: unread,
  };
}
