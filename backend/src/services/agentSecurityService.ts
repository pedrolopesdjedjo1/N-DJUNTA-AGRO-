import { prisma } from "../lib/prisma";
import { SECURITY_KINDS, SECURITY_STATUS } from "../lib/agentFinanceCatalog";
import { values } from "../lib/ngoCatalog";
import { clean, plain } from "../lib/agentScope";
import { forgetAssistCache } from "../middleware/assistGuard";
import { assertAdmin, assertAgent, ensureProfile } from "./agentService";
import { removeClient, revokeAgent } from "./agentClientService";
import { getMyProfile } from "./agentService";

const KIND_VALUES = values(SECURITY_KINDS);
const STATUS_VALUES = values(SECURITY_STATUS);
const DAY = 86400000;
const MAX_REPORTS_PER_DAY = 10;

// Limites a partir dos quais um agente aparece com sinais de alerta
const SIGNALS = { sessions24h: 25, registrations24h: 15, actions24h: 150 };

async function notifyAdmins(title: string, message: string, relatedId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "SISTEMA" as const, title, message, relatedId })),
  });
}

// =====================================================================
// A minha segurança
// =====================================================================
export async function getSecurity(agentId: string, role: string | undefined) {
  assertAgent(role);
  const profile = await ensureProfile(agentId);
  const month = new Date(Date.now() - 30 * DAY);

  const [user, documents, activeSessions, recentSessions, kinds, recentActivities, openReports] = await Promise.all([
    prisma.user.findUnique({ where: { id: agentId }, select: { name: true, isVerified: true, photoUrl: true } }),
    prisma.agentDocument.count({ where: { agentId, kind: "IDENTIFICACAO" } }),
    prisma.agentSession.findMany({ where: { agentId, endedAt: null, expiresAt: { gt: new Date() } }, orderBy: { startedAt: "desc" } }),
    prisma.agentSession.findMany({ where: { agentId }, orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.agentActivity.groupBy({ by: ["kind"], where: { agentId, createdAt: { gte: month } }, _count: { _all: true } }),
    prisma.agentActivity.findMany({ where: { agentId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.agentSecurityReport.count({ where: { reporterId: agentId, status: { not: "RESOLVIDO" } } }),
  ]);

  const nameIds = Array.from(new Set([...recentSessions.map((s) => s.clientId), ...recentActivities.map((a) => a.clientId)].filter(Boolean))) as string[];
  const named = nameIds.length ? await prisma.user.findMany({ where: { id: { in: nameIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(named.map((n) => [n.id, n.name]));

  const locked = !!profile.lockedAt;
  const checks = [
    { key: "approved", label: "Conta de agente aprovada pela equipa", ok: profile.status === "APROVADO" },
    { key: "verified", label: "Identidade verificada", ok: !!user?.isVerified },
    { key: "document", label: "Documento de identificação enviado", ok: documents > 0 },
    { key: "photo", label: "Foto de perfil", ok: !!user?.photoUrl },
    { key: "unlocked", label: "Sem bloqueio de segurança", ok: !locked },
  ];

  const kindCounts: Record<string, number> = {};
  kinds.forEach((k) => (kindCounts[k.kind] = k._count._all));

  return {
    status: profile.status,
    statusNote: profile.statusNote,
    locked,
    lockedAt: profile.lockedAt,
    lockReason: profile.lockReason,
    permissions: { canRegister: profile.canRegister, canAssist: profile.canAssist, commissionRate: profile.commissionRate },
    checks,
    protected: checks.every((c) => c.ok),
    activeSessions: activeSessions.map((s) => ({ id: s.id, clientId: s.clientId, clientName: names.get(s.clientId) ?? null, expiresAt: s.expiresAt, startedAt: s.startedAt })),
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      clientName: names.get(s.clientId) ?? null,
      reason: s.reason,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      expiresAt: s.expiresAt,
      actions: s.actions,
    })),
    activityCounts: kindCounts,
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      kind: a.kind,
      message: a.message,
      clientName: a.clientId ? names.get(a.clientId) ?? null : null,
      createdAt: a.createdAt,
    })),
    openReports,
  };
}

// Bloqueio de segurança: termina já as sessões e impede registar pessoas e ajudar nas contas.
// Só a equipa do app o levanta (assim, quem roubar o telemóvel não o desfaz).
export async function lockAccount(agentId: string, role: string | undefined, reasonInput: any) {
  assertAgent(role);
  const profile = await ensureProfile(agentId);

  if (profile.lockedAt) {
    throw new Error("A sua conta já está bloqueada. Fale com a equipa do NÔDJUNTA AGRO.");
  }

  const reason = clean(reasonInput, 300);
  await prisma.agentProfile.update({
    where: { userId: agentId },
    data: { lockedAt: new Date(), lockReason: reason, canRegister: false, canAssist: false },
  });
  await prisma.agentSession.updateMany({ where: { agentId, endedAt: null }, data: { endedAt: new Date() } });
  forgetAssistCache();

  await prisma.agentActivity.create({
    data: { agentId, clientId: null, kind: "NOTA", message: `Bloqueio de segurança${reason ? `: ${reason}` : ""}`, isPrivate: true },
  });

  const user = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  await notifyAdmins("Agente bloqueou a conta", `${user?.name ?? "Um agente"} ativou o bloqueio de segurança${reason ? `: ${reason}` : "."}`, profile.id);

  return getSecurity(agentId, role);
}

// =====================================================================
// Denunciar problemas e bloquear atividades suspeitas
// =====================================================================
export async function createSecurityReport(userId: string, role: string | undefined, input: any) {
  const kind = String(input?.kind ?? "");
  if (!KIND_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de problema.");
  }
  const description = clean(input?.description, 1000);
  if (!description || description.length < 10) {
    throw new Error("Explique o que aconteceu (pelo menos 10 letras).");
  }

  const today = await prisma.agentSecurityReport.count({ where: { reporterId: userId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (today >= MAX_REPORTS_PER_DAY) {
    throw new Error("Já enviou várias denúncias hoje. Tente amanhã.");
  }

  let targetUserId: string | null = null;

  // Bloquear: o agente tira o cliente da carteira, ou o cliente retira o acesso ao agente
  if (input?.blockLinkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: String(input.blockLinkId) } });
    if (!link) {
      throw new Error("Acesso não encontrado.");
    }
    if (link.agentId === userId) {
      targetUserId = link.clientId;
      if (link.status !== "REVOGADO" && link.status !== "RECUSADO") await removeClient(userId, role, link.id);
    } else if (link.clientId === userId) {
      targetUserId = link.agentId;
      if (link.status !== "REVOGADO" && link.status !== "RECUSADO") await revokeAgent(userId, link.id);
    } else {
      throw new Error("Acesso não encontrado.");
    }
  } else if (input?.targetUserId) {
    const target = await prisma.user.findUnique({ where: { id: String(input.targetUserId) }, select: { id: true } });
    if (!target) {
      throw new Error("Pessoa não encontrada.");
    }
    if (target.id === userId) {
      throw new Error("Não pode denunciar a sua própria conta.");
    }
    targetUserId = target.id;
  }

  const created = await prisma.agentSecurityReport.create({
    data: { reporterId: userId, targetUserId, kind, description },
  });

  const reporter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const kindLabel = SECURITY_KINDS.find((k) => k.value === kind)?.label ?? kind;
  await notifyAdmins("Nova denúncia de segurança", `${reporter?.name ?? "Alguém"}: ${kindLabel}`, created.id);

  return { id: created.id, status: created.status, blocked: !!input?.blockLinkId };
}

export async function listMySecurityReports(userId: string) {
  return prisma.agentSecurityReport.findMany({ where: { reporterId: userId }, orderBy: { createdAt: "desc" }, take: 50 });
}

// =====================================================================
// Equipa do app: supervisão dos agentes
// =====================================================================
export async function adminUnlock(role: string | undefined, adminId: string, agentUserId: string, noteInput: any) {
  assertAdmin(role);

  const profile = await prisma.agentProfile.findUnique({ where: { userId: agentUserId } });
  if (!profile) {
    throw new Error("Agente não encontrado.");
  }
  if (!profile.lockedAt) {
    throw new Error("Esta conta não está bloqueada.");
  }

  const note = clean(noteInput, 300);
  await prisma.agentProfile.update({
    where: { userId: agentUserId },
    data: { lockedAt: null, lockReason: null, canRegister: true, canAssist: true, reviewedAt: new Date(), reviewedBy: adminId },
  });
  await prisma.agentActivity.create({
    data: { agentId: agentUserId, clientId: null, kind: "NOTA", message: `Bloqueio levantado pela equipa${note ? `: ${note}` : ""}`, isPrivate: true },
  });
  await prisma.notification.create({
    data: {
      userId: agentUserId,
      type: "SISTEMA",
      title: "Bloqueio de segurança levantado",
      message: `A equipa confirmou a sua conta e voltou a ativar o registo de pessoas e a ajuda nas contas.${note ? ` ${note}` : ""}`.slice(0, 300),
      relatedId: profile.id,
    },
  });

  return { userId: agentUserId, unlocked: true };
}

export async function adminAgentDetail(role: string | undefined, agentUserId: string) {
  assertAdmin(role);

  const profile = await prisma.agentProfile.findUnique({ where: { userId: agentUserId } });
  if (!profile) {
    throw new Error("Agente não encontrado.");
  }

  const [user, documents, links, sessions, activities, commissions, reportsAgainst] = await Promise.all([
    prisma.user.findUnique({ where: { id: agentUserId }, select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true, createdAt: true } }),
    prisma.agentDocument.findMany({ where: { agentId: agentUserId }, orderBy: { createdAt: "desc" } }),
    prisma.agentClient.groupBy({ by: ["status"], where: { agentId: agentUserId }, _count: { _all: true } }),
    prisma.agentSession.findMany({ where: { agentId: agentUserId }, orderBy: { startedAt: "desc" }, take: 20 }),
    prisma.agentActivity.findMany({ where: { agentId: agentUserId }, orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.agentCommission.groupBy({ by: ["status"], where: { agentId: agentUserId }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.agentSecurityReport.findMany({ where: { targetUserId: agentUserId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const ids = Array.from(new Set([...sessions.map((s) => s.clientId), ...activities.map((a) => a.clientId)].filter(Boolean))) as string[];
  const named = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const names = new Map(named.map((n) => [n.id, n.name]));

  const counts: Record<string, number> = {};
  links.forEach((l) => (counts[l.status] = l._count._all));
  const amountOf = (status: string) => Math.round(commissions.find((c) => c.status === status)?._sum.amount ?? 0);

  return {
    profile,
    user,
    documents,
    clients: { active: counts.ATIVO ?? 0, pending: counts.PENDENTE_ACEITACAO ?? 0, ended: (counts.REVOGADO ?? 0) + (counts.RECUSADO ?? 0) },
    sessions: sessions.map((s) => ({ ...s, clientName: names.get(s.clientId) ?? null })),
    activities: activities.map((a) => ({ ...a, clientName: a.clientId ? names.get(a.clientId) ?? null : null })),
    commissions: { pending: amountOf("PENDENTE"), paid: amountOf("PAGO") },
    reportsAgainst,
  };
}

// Agentes com atividade fora do normal nas últimas 24 horas
export async function adminSignals(role: string | undefined) {
  assertAdmin(role);

  const since = new Date(Date.now() - DAY);
  const [profiles, sessions, registrations, openReports] = await Promise.all([
    prisma.agentProfile.findMany({ where: { status: { in: ["APROVADO", "SUSPENSO"] } }, select: { userId: true, status: true, lockedAt: true } }),
    prisma.agentSession.findMany({ where: { startedAt: { gte: since } }, select: { agentId: true, actions: true }, take: 10000 }),
    prisma.agentActivity.groupBy({ by: ["agentId"], where: { kind: "CADASTRO", createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.agentSecurityReport.groupBy({ by: ["targetUserId"], where: { status: { not: "RESOLVIDO" }, NOT: { targetUserId: null } }, _count: { _all: true } }),
  ]);

  const names = profiles.length
    ? await prisma.user.findMany({ where: { id: { in: profiles.map((p) => p.userId) } }, select: { id: true, name: true, phone: true } })
    : [];
  const nameMap = new Map(names.map((n) => [n.id, n]));

  const items = profiles
    .map((p) => {
      const mine = sessions.filter((s) => s.agentId === p.userId);
      const metrics = {
        sessions24h: mine.length,
        actions24h: mine.reduce((s, x) => s + x.actions, 0),
        registrations24h: registrations.find((r) => r.agentId === p.userId)?._count._all ?? 0,
        openReportsAgainst: openReports.find((r) => r.targetUserId === p.userId)?._count._all ?? 0,
      };

      const flags: string[] = [];
      if (metrics.sessions24h >= SIGNALS.sessions24h) flags.push("Muitas sessões de ajuda em 24 horas");
      if (metrics.actions24h >= SIGNALS.actions24h) flags.push("Muitas alterações feitas em contas em 24 horas");
      if (metrics.registrations24h >= SIGNALS.registrations24h) flags.push("Muitas contas registadas em 24 horas");
      if (metrics.openReportsAgainst > 0) flags.push("Tem denúncias por analisar");
      if (p.lockedAt) flags.push("Bloqueou a própria conta");
      if (p.status === "SUSPENSO") flags.push("Conta suspensa");

      return { agentId: p.userId, agent: nameMap.get(p.userId) ?? null, status: p.status, locked: !!p.lockedAt, metrics, flags };
    })
    .filter((i) => i.flags.length > 0)
    .sort((a, b) => b.flags.length - a.flags.length);

  return { thresholds: SIGNALS, items };
}

export async function adminListSecurityReports(role: string | undefined, filters: { status?: string; q?: string }) {
  assertAdmin(role);

  const status = filters.status && STATUS_VALUES.includes(filters.status) ? filters.status : "ABERTO";
  const [rows, groups] = await Promise.all([
    prisma.agentSecurityReport.findMany({ where: { status }, orderBy: { createdAt: "asc" }, take: 200 }),
    prisma.agentSecurityReport.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const ids = Array.from(new Set(rows.flatMap((r) => [r.reporterId, r.targetUserId]).filter(Boolean))) as string[];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, role: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  const needle = plain(filters.q);
  return {
    counts,
    items: rows
      .map((r) => ({
        ...r,
        reporter: userMap.get(r.reporterId) ?? null,
        target: r.targetUserId ? userMap.get(r.targetUserId) ?? null : null,
      }))
      .filter((r) => !needle || plain(`${r.description} ${r.reporter?.name} ${r.target?.name}`).includes(needle)),
  };
}

export async function adminRespondSecurityReport(role: string | undefined, adminId: string, id: string, input: any) {
  assertAdmin(role);

  const found = await prisma.agentSecurityReport.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Denúncia não encontrada.");
  }

  const status = String(input?.status ?? "");
  if (!["EM_ANALISE", "RESOLVIDO"].includes(status)) {
    throw new Error("Estado inválido.");
  }
  const note = clean(input?.note, 600);
  if (status === "RESOLVIDO" && (!note || note.length < 3)) {
    throw new Error("Escreva o que foi feito para resolver.");
  }

  await prisma.agentSecurityReport.update({ where: { id }, data: { status, adminNote: note ?? found.adminNote } });
  await prisma.notification.create({
    data: {
      userId: found.reporterId,
      type: "SISTEMA",
      title: status === "RESOLVIDO" ? "A sua denúncia foi resolvida" : "A sua denúncia está em análise",
      message: (note ?? "A equipa do NÔDJUNTA AGRO está a analisar o que reportou.").slice(0, 300),
      relatedId: id,
    },
  });

  return { id, status };
}
