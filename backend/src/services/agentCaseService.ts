import { prisma } from "../lib/prisma";
import { CASE_CATEGORIES, CASE_STATUS } from "../lib/agentOpsCatalog";
import { values } from "../lib/ngoCatalog";
import { clean, clientScope, plain } from "../lib/agentScope";
import { assertAdmin, assertAgent, requireApproved } from "./agentService";

const CATEGORY_VALUES = values(CASE_CATEGORIES);
const STATUS_VALUES = values(CASE_STATUS);
const MAX_OPEN = 100;

function categoryLabel(value: string): string {
  return CASE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

async function notifyAdmins(title: string, message: string, relatedId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "SISTEMA" as const, title, message, relatedId })),
  });
}

async function addEvent(caseId: string, authorId: string, clientId: string | null, message: string) {
  await prisma.agentActivity.create({
    data: { agentId: authorId, clientId, kind: "PROBLEMA", message, relatedId: caseId, isPrivate: true },
  });
}

async function ownCase(agentId: string, id: string) {
  const found = await prisma.agentCase.findUnique({ where: { id } });
  if (!found || found.agentId !== agentId) {
    throw new Error("Chamado não encontrado.");
  }
  return found;
}

async function shape(agentId: string, cases: any[]) {
  const clientIds = Array.from(new Set(cases.map((c) => c.clientId).filter(Boolean))) as string[];
  const [users, links] = clientIds.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }),
        prisma.agentClient.findMany({ where: { agentId, clientId: { in: clientIds } }, select: { id: true, clientId: true } }),
      ])
    : [[], []];

  const names = new Map((users as any[]).map((u) => [u.id, u.name]));
  const linkIds = new Map((links as any[]).map((l) => [l.clientId, l.id]));

  return cases.map((c) => ({
    ...c,
    clientName: c.clientId ? names.get(c.clientId) ?? null : null,
    linkId: c.clientId ? linkIds.get(c.clientId) ?? null : null,
  }));
}

// =====================================================================
// Chamados do agente
// =====================================================================
export async function listCases(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; category?: string; linkId?: string; orderId?: string; q?: string }
) {
  assertAgent(role);

  const rows = await prisma.agentCase.findMany({ where: { agentId }, orderBy: { updatedAt: "desc" }, take: 400 });

  const counts: Record<string, number> = { ABERTO: 0, EM_CURSO: 0, ESCALADO: 0, RESOLVIDO: 0 };
  rows.forEach((c) => (counts[c.status] = (counts[c.status] ?? 0) + 1));

  let list = rows;
  if (filters.status) list = list.filter((c) => c.status === filters.status);
  else list = list.filter((c) => c.status !== "RESOLVIDO");
  if (filters.category) list = list.filter((c) => c.category === filters.category);
  if (filters.orderId) list = list.filter((c) => c.orderId === filters.orderId);
  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) throw new Error("Cliente não encontrado.");
    list = list.filter((c) => c.clientId === link.clientId);
  }
  const needle = plain(filters.q);
  if (needle) list = list.filter((c) => plain(`${c.title} ${c.description}`).includes(needle));

  return { counts: { ...counts, total: rows.length }, items: await shape(agentId, list.slice(0, 200)) };
}

export async function createCase(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await requireApproved(agentId);

  const open = await prisma.agentCase.count({ where: { agentId, status: { not: "RESOLVIDO" } } });
  if (open >= MAX_OPEN) {
    throw new Error(`Já tem ${MAX_OPEN} chamados por resolver. Resolva alguns antes de abrir outros.`);
  }

  const category = String(input?.category ?? "");
  if (!CATEGORY_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de problema.");
  }
  const title = clean(input?.title, 150);
  if (!title || title.length < 3) {
    throw new Error("Escreva um título curto.");
  }
  const description = clean(input?.description, 1500);
  if (!description || description.length < 10) {
    throw new Error("Explique o problema (pelo menos 10 letras).");
  }

  const scope = await clientScope(agentId);
  let clientId: string | null = null;
  if (input?.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: String(input.linkId) } });
    if (!link || link.agentId !== agentId) {
      throw new Error("Cliente não encontrado.");
    }
    clientId = link.clientId;
  }

  let orderId: string | null = null;
  if (input?.orderId) {
    const order: any = await prisma.order.findUnique({ where: { id: String(input.orderId) } });
    if (!order || (!scope.set.has(order.buyerId) && !scope.set.has(order.sellerId))) {
      throw new Error("Encomenda não encontrada.");
    }
    orderId = order.id;
    if (!clientId) clientId = scope.set.has(order.buyerId) ? order.buyerId : order.sellerId;
  }

  const created = await prisma.agentCase.create({
    data: { agentId, clientId, orderId, category, title, description },
  });
  await addEvent(created.id, agentId, clientId, `Chamado aberto: ${description}`);

  const [item] = await shape(agentId, [created]);
  return item;
}

export async function getCase(agentId: string, role: string | undefined, id: string) {
  assertAgent(role);
  const found = await ownCase(agentId, id);

  const [events, [item]] = await Promise.all([
    prisma.agentActivity.findMany({ where: { relatedId: id, kind: "PROBLEMA" }, orderBy: { createdAt: "asc" }, take: 200 }),
    shape(agentId, [found]),
  ]);

  const authorIds = Array.from(new Set(events.map((e) => e.agentId).filter((a) => a !== agentId)));
  const authors = authorIds.length ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(authors.map((a) => [a.id, a.name]));

  return {
    case: item,
    events: events.map((e) => ({
      id: e.id,
      message: e.message,
      createdAt: e.createdAt,
      fromTeam: e.agentId !== agentId,
      authorName: e.agentId !== agentId ? names.get(e.agentId) ?? "Equipa NÔDJUNTA AGRO" : "Você",
    })),
  };
}

export async function addCaseNote(agentId: string, role: string | undefined, id: string, messageInput: any) {
  assertAgent(role);
  const found = await ownCase(agentId, id);
  if (found.status === "RESOLVIDO") {
    throw new Error("Este chamado já está resolvido. Reabra-o para juntar notas.");
  }

  const message = clean(messageInput, 800);
  if (!message || message.length < 3) {
    throw new Error("Escreva a nota.");
  }

  await addEvent(id, agentId, found.clientId, message);
  await prisma.agentCase.update({
    where: { id },
    data: { status: found.status === "ABERTO" ? "EM_CURSO" : found.status },
  });

  return getCase(agentId, role, id);
}

export async function setCaseStatus(agentId: string, role: string | undefined, id: string, input: any) {
  assertAgent(role);
  const found = await ownCase(agentId, id);

  const status = String(input?.status ?? "");
  if (!["ABERTO", "EM_CURSO", "RESOLVIDO"].includes(status)) {
    throw new Error("Estado inválido.");
  }
  if (found.status === "ESCALADO") {
    throw new Error("Este chamado está com a equipa. Aguarde a resposta ou junte uma nota.");
  }

  if (status === "RESOLVIDO") {
    const resolution = clean(input?.resolution, 800);
    if (!resolution || resolution.length < 3) {
      throw new Error("Escreva como o problema foi resolvido.");
    }

    await prisma.agentCase.update({ where: { id }, data: { status, resolution, resolvedAt: new Date() } });
    await addEvent(id, agentId, found.clientId, `Resolvido: ${resolution}`);

    if (input?.notifyClient === true && found.clientId) {
      await prisma.notification.create({
        data: {
          userId: found.clientId,
          type: "SISTEMA",
          title: "O seu problema foi resolvido",
          message: `${found.title}. ${resolution}`.slice(0, 300),
          relatedId: id,
        },
      });
    }
  } else {
    await prisma.agentCase.update({ where: { id }, data: { status, resolution: null, resolvedAt: null } });
    if (found.status === "RESOLVIDO") await addEvent(id, agentId, found.clientId, "Chamado reaberto");
  }

  return getCase(agentId, role, id);
}

// Passa o chamado à equipa do NÔDJUNTA AGRO
export async function escalateCase(agentId: string, role: string | undefined, id: string, messageInput: any) {
  assertAgent(role);
  const found = await ownCase(agentId, id);

  if (found.status === "RESOLVIDO") {
    throw new Error("Este chamado já está resolvido.");
  }
  if (found.status === "ESCALADO") {
    throw new Error("Este chamado já está com a equipa.");
  }

  const message = clean(messageInput, 800);
  if (!message || message.length < 10) {
    throw new Error("Explique o que já tentou e o que precisa da equipa (pelo menos 10 letras).");
  }

  await prisma.agentCase.update({ where: { id }, data: { status: "ESCALADO", escalatedAt: new Date() } });
  await addEvent(id, agentId, found.clientId, `Passado à equipa: ${message}`);

  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  await notifyAdmins(
    "Chamado de agente para a equipa",
    `${agent?.name ?? "Um agente"}: ${found.title} (${categoryLabel(found.category)})`,
    id
  );

  return getCase(agentId, role, id);
}

export async function deleteCase(agentId: string, role: string | undefined, id: string) {
  assertAgent(role);
  const found = await ownCase(agentId, id);

  if (found.status !== "ABERTO") {
    throw new Error("Só pode apagar um chamado que ainda está aberto e sem andamento.");
  }

  await prisma.agentActivity.deleteMany({ where: { relatedId: id, kind: "PROBLEMA" } });
  await prisma.agentCase.delete({ where: { id } });
  return { id, deleted: true };
}

// =====================================================================
// Equipa do app: chamados que os agentes lhe passaram
// =====================================================================
export async function adminListCases(role: string | undefined, filters: { status?: string }) {
  assertAdmin(role);

  const status = filters.status && STATUS_VALUES.includes(filters.status) ? filters.status : "ESCALADO";
  const [rows, groups] = await Promise.all([
    prisma.agentCase.findMany({ where: { status }, orderBy: { escalatedAt: "asc" }, take: 200 }),
    prisma.agentCase.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const ids = Array.from(new Set(rows.flatMap((c) => [c.agentId, c.clientId]).filter(Boolean))) as string[];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  return {
    counts,
    items: rows.map((c) => ({
      ...c,
      agent: userMap.get(c.agentId) ?? null,
      clientName: c.clientId ? userMap.get(c.clientId)?.name ?? null : null,
    })),
  };
}

export async function adminGetCase(role: string | undefined, id: string) {
  assertAdmin(role);

  const found = await prisma.agentCase.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Chamado não encontrado.");
  }

  const events = await prisma.agentActivity.findMany({ where: { relatedId: id, kind: "PROBLEMA" }, orderBy: { createdAt: "asc" }, take: 200 });
  const ids = Array.from(new Set([found.agentId, found.clientId, ...events.map((e) => e.agentId)].filter(Boolean))) as string[];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true } });
  const names = new Map(users.map((u) => [u.id, u]));

  return {
    case: { ...found, agent: names.get(found.agentId) ?? null, clientName: found.clientId ? names.get(found.clientId)?.name ?? null : null },
    events: events.map((e) => ({
      id: e.id,
      message: e.message,
      createdAt: e.createdAt,
      fromTeam: e.agentId !== found.agentId,
      authorName: names.get(e.agentId)?.name ?? "Equipa NÔDJUNTA AGRO",
    })),
  };
}

export async function adminRespondCase(role: string | undefined, adminId: string, id: string, input: any) {
  assertAdmin(role);

  const found = await prisma.agentCase.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Chamado não encontrado.");
  }
  if (found.status === "RESOLVIDO") {
    throw new Error("Este chamado já está resolvido.");
  }

  const message = clean(input?.message, 800);
  if (!message || message.length < 3) {
    throw new Error("Escreva a resposta ao agente.");
  }

  const resolved = input?.status === "RESOLVIDO";
  await prisma.agentCase.update({
    where: { id },
    data: resolved
      ? { status: "RESOLVIDO", resolution: message, resolvedAt: new Date() }
      : { status: "EM_CURSO", escalatedAt: null },
  });
  await addEvent(id, adminId, found.clientId, message);

  await prisma.notification.create({
    data: {
      userId: found.agentId,
      type: "SISTEMA",
      title: resolved ? "A equipa resolveu o seu chamado" : "A equipa respondeu ao seu chamado",
      message: `${found.title}: ${message}`.slice(0, 300),
      relatedId: id,
    },
  });

  return adminGetCase(role, id);
}
