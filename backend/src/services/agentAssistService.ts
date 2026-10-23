import { prisma } from "../lib/prisma";
import { ASSIST_REASONS, CLIENT_ROLES } from "../lib/agentCatalog";
import { values } from "../lib/ngoCatalog";
import { signAssistToken } from "../lib/assistToken";
import { forgetAssistCache } from "../middleware/assistGuard";
import { assertAgent, requireApproved } from "./agentService";

const SESSION_MINUTES = 30;
const MAX_TOTAL_MINUTES = 120;
const MAX_ACTIVE_SESSIONS = 3;
const REASON_VALUES = values(ASSIST_REASONS);

async function ownSession(agentId: string, sessionId: string) {
  const session = await prisma.agentSession.findUnique({ where: { id: sessionId } });
  if (!session || session.agentId !== agentId) {
    throw new Error("Sessão de ajuda não encontrada.");
  }
  return session;
}

async function clientCard(clientId: string) {
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, role: true, photoUrl: true, location: true, isActive: true },
  });
  if (!client || !client.isActive) {
    throw new Error("A conta desta pessoa já não está ativa.");
  }
  if (!CLIENT_ROLES.includes(String(client.role))) {
    throw new Error("Não pode ajudar este tipo de conta.");
  }
  return client;
}

// Começa uma sessão: o agente passa a usar a conta do cliente durante 30 minutos
export async function startAssist(agentId: string, role: string | undefined, linkId: string, input: any) {
  assertAgent(role);
  await requireApproved(agentId, "assist");

  const link = await prisma.agentClient.findUnique({ where: { id: linkId } });
  if (!link || link.agentId !== agentId) {
    throw new Error("Cliente não encontrado.");
  }
  if (link.status !== "ATIVO") {
    throw new Error(link.status === "PENDENTE_ACEITACAO" ? "A pessoa ainda não aceitou o seu convite." : "O acesso a esta conta foi retirado.");
  }

  const client = await clientCard(link.clientId);
  const reason = REASON_VALUES.includes(String(input?.reason)) ? String(input.reason) : "OUTRO";

  // Mantém no máximo 3 sessões abertas: termina as mais antigas
  const active = await prisma.agentSession.findMany({
    where: { agentId, endedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "asc" },
  });
  if (active.length >= MAX_ACTIVE_SESSIONS) {
    const old = active.slice(0, active.length - MAX_ACTIVE_SESSIONS + 1).map((s) => s.id);
    await prisma.agentSession.updateMany({ where: { id: { in: old } }, data: { endedAt: new Date() } });
    forgetAssistCache();
  }

  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60000);
  const session = await prisma.agentSession.create({
    data: { agentId, clientId: client.id, linkId: link.id, reason, expiresAt },
  });

  const token = signAssistToken({ id: client.id, role: String(client.role) }, agentId, session.id, expiresAt);

  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  const reasonLabel = ASSIST_REASONS.find((r) => r.value === reason)?.label ?? "Outro";

  await prisma.agentActivity.create({
    data: { agentId, clientId: client.id, kind: "ASSISTENCIA_INICIADA", message: reasonLabel, relatedId: session.id },
  });
  await prisma.notification.create({
    data: {
      userId: client.id,
      type: "SISTEMA",
      title: "Sessão de ajuda iniciada",
      message: `${agent?.name ?? "O seu agente"} está a ajudar na sua conta (${reasonLabel}). A sessão termina sozinha em ${SESSION_MINUTES} minutos.`,
      relatedId: session.id,
    },
  });

  return {
    sessionId: session.id,
    token,
    expiresAt,
    startedAt: session.startedAt,
    reason,
    client: {
      id: client.id,
      name: client.name,
      role: String(client.role),
      photoUrl: client.photoUrl,
      location: client.location,
    },
  };
}

// Prolonga mais 30 minutos, até ao máximo de 2 horas no total
export async function renewAssist(agentId: string, role: string | undefined, sessionId: string) {
  assertAgent(role);
  await requireApproved(agentId, "assist");

  const session = await ownSession(agentId, sessionId);
  if (session.endedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new Error("Esta sessão já terminou. Inicie uma nova.");
  }

  const link = session.linkId ? await prisma.agentClient.findUnique({ where: { id: session.linkId } }) : null;
  if (!link || link.status !== "ATIVO") {
    throw new Error("O acesso a esta conta foi retirado.");
  }

  const cap = session.startedAt.getTime() + MAX_TOTAL_MINUTES * 60000;
  const next = Math.min(Date.now() + SESSION_MINUTES * 60000, cap);
  if (next <= session.expiresAt.getTime() + 60000) {
    throw new Error("Atingiu o tempo máximo de 2 horas. Termine e inicie outra sessão.");
  }

  const expiresAt = new Date(next);
  const client = await clientCard(session.clientId);
  await prisma.agentSession.update({ where: { id: session.id }, data: { expiresAt } });
  forgetAssistCache();

  const token = signAssistToken({ id: client.id, role: String(client.role) }, agentId, session.id, expiresAt);
  return { sessionId: session.id, token, expiresAt };
}

export async function endAssist(agentId: string, role: string | undefined, sessionId: string) {
  assertAgent(role);

  const session = await ownSession(agentId, sessionId);
  if (session.endedAt) {
    return { sessionId: session.id, ended: true, actions: session.actions };
  }

  await prisma.agentSession.update({ where: { id: session.id }, data: { endedAt: new Date() } });
  forgetAssistCache();

  await prisma.agentActivity.create({
    data: {
      agentId,
      clientId: session.clientId,
      kind: "ASSISTENCIA_TERMINADA",
      message: session.actions > 0 ? `${session.actions} alteração(ões) feita(s) na conta` : "Sem alterações na conta",
      relatedId: session.id,
    },
  });

  return { sessionId: session.id, ended: true, actions: session.actions };
}

export async function listSessions(agentId: string, role: string | undefined, filters: { linkId?: string; limit?: number }) {
  assertAgent(role);

  const where: any = { agentId };
  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) {
      throw new Error("Cliente não encontrado.");
    }
    where.clientId = link.clientId;
  }

  const sessions = await prisma.agentSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: Math.min(100, Math.max(10, Math.floor(filters.limit ?? 50))),
  });

  const ids = Array.from(new Set(sessions.map((s) => s.clientId)));
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  const now = Date.now();
  return sessions.map((s) => ({
    ...s,
    clientName: names.get(s.clientId) ?? null,
    isActive: !s.endedAt && s.expiresAt.getTime() > now,
  }));
}
