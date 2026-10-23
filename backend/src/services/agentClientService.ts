import { prisma } from "../lib/prisma";
import { CLIENT_ROLES, MANUAL_ACTIVITY_KINDS, ORDER_CLOSED } from "../lib/agentCatalog";
import { findRegion } from "../lib/ngoRegions";
import { assertAgent, requireApproved } from "./agentService";
import { forgetAssistCache } from "../middleware/assistGuard";

const MAX_CLIENTS = 500;
const MAX_REGISTERED_PER_DAY = 30;
const MAX_INVITES_PER_DAY = 20;
const REGISTER_WINDOW_MS = 20 * 60 * 1000;
const DAY = 86400000;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function digits(value: any): string {
  return String(value ?? "").replace(/\D/g, "");
}

// Compara telefones pelos últimos 8 números (com ou sem o 245 à frente)
function phonesMatch(a: any, b: any): boolean {
  const x = digits(a);
  const y = digits(b);
  if (x.length < 7 || y.length < 7) return false;
  return x.slice(-8) === y.slice(-8);
}

function clientShape(user: any) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone ?? null,
    role: String(user.role),
    location: user.location ?? null,
    regionKey: findRegion(user.location)?.key ?? null,
    isVerified: !!user.isVerified,
    photoUrl: user.photoUrl ?? null,
    createdAt: user.createdAt,
  };
}

const USER_SELECT = {
  id: true,
  name: true,
  phone: true,
  role: true,
  location: true,
  isVerified: true,
  isActive: true,
  photoUrl: true,
  createdAt: true,
} as const;

async function notify(userId: string, title: string, message: string, relatedId: string) {
  await prisma.notification.create({ data: { userId, type: "SISTEMA", title, message, relatedId } });
}

async function logActivity(
  agentId: string,
  clientId: string | null,
  kind: string,
  message: string | null,
  extra: { relatedId?: string; isPrivate?: boolean } = {}
) {
  await prisma.agentActivity.create({
    data: { agentId, clientId, kind, message, relatedId: extra.relatedId ?? null, isPrivate: extra.isPrivate ?? false },
  });
}

async function agentName(agentId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  return user?.name ?? "Um agente";
}

// Encomendas em aberto de cada pessoa (se algo falhar, a lista continua a funcionar)
async function openOrdersByUser(ids: string[]) {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;

  try {
    const orders = await prisma.order.findMany({
      where: { OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] },
      select: { buyerId: true, sellerId: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });
    const wanted = new Set(ids);
    orders.forEach((o) => {
      if (ORDER_CLOSED.includes(String(o.status))) return;
      [o.buyerId, o.sellerId].forEach((id) => {
        if (id && wanted.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
      });
    });
  } catch (error) {
    console.error("agent: contagem de encomendas", error);
  }
  return counts;
}

async function ownLink(agentId: string, linkId: string) {
  const link = await prisma.agentClient.findUnique({ where: { id: linkId } });
  if (!link || link.agentId !== agentId) {
    throw new Error("Cliente não encontrado.");
  }
  return link;
}

// =====================================================================
// Registar e convidar pessoas
// =====================================================================

// A conta foi criada agora pelo agente, com a pessoa ao lado: liga-a à carteira do agente
export async function linkRegisteredClient(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await requireApproved(agentId, "register");

  const target = await prisma.user.findUnique({ where: { id: String(input?.userId ?? "") }, select: USER_SELECT });
  if (!target || !target.isActive) {
    throw new Error("Conta não encontrada.");
  }
  if (target.id === agentId) {
    throw new Error("Não pode ligar a sua própria conta.");
  }
  if (!CLIENT_ROLES.includes(String(target.role))) {
    throw new Error("Este tipo de conta não pode ser registado por um agente.");
  }
  if (Date.now() - new Date(target.createdAt).getTime() > REGISTER_WINDOW_MS) {
    throw new Error("Só pode ligar contas criadas há menos de 20 minutos. Se a pessoa já tinha conta, envie-lhe um convite.");
  }
  if (!phonesMatch(target.phone, input?.phone)) {
    throw new Error("O telefone não corresponde à conta criada.");
  }

  const [existing, takenByOther, total, today] = await Promise.all([
    prisma.agentClient.findUnique({ where: { agentId_clientId: { agentId, clientId: target.id } } }),
    prisma.agentClient.findFirst({ where: { clientId: target.id, origin: "REGISTADO", status: "ATIVO", NOT: { agentId } } }),
    prisma.agentClient.count({ where: { agentId, status: { in: ["ATIVO", "PENDENTE_ACEITACAO"] } } }),
    prisma.agentClient.count({ where: { agentId, origin: "REGISTADO", createdAt: { gte: new Date(Date.now() - DAY) } } }),
  ]);

  if (existing) {
    throw new Error("Esta pessoa já está na sua carteira de clientes.");
  }
  if (takenByOther) {
    throw new Error("Esta conta já foi registada por outro agente.");
  }
  if (total >= MAX_CLIENTS) {
    throw new Error(`Pode ter até ${MAX_CLIENTS} clientes.`);
  }
  if (today >= MAX_REGISTERED_PER_DAY) {
    throw new Error("Já registou muitas pessoas hoje. Tente amanhã.");
  }

  const link = await prisma.agentClient.create({
    data: {
      agentId,
      clientId: target.id,
      origin: "REGISTADO",
      status: "ATIVO",
      consentMode: "PRESENCIAL",
      consentAt: new Date(),
      notes: clean(input?.notes, 500),
    },
  });

  const name = await agentName(agentId);
  await logActivity(agentId, target.id, "CADASTRO", "Conta registada com o agente");
  await notify(
    target.id,
    "Foi registado por um agente",
    `${name} registou a sua conta e pode ajudá-lo a usar o app. Se não o conhece, retire o acesso em Configurações, Os meus agentes.`,
    link.id
  );

  return { id: link.id, client: clientShape(target) };
}

// A pessoa já tem conta: o agente envia um convite e ela aceita ou recusa
export async function inviteExistingUser(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await requireApproved(agentId, "register");

  const phone = clean(input?.phone, 20);
  if (!phone || digits(phone).length < 7) {
    throw new Error("Escreva o telefone da pessoa.");
  }

  const candidates = await prisma.user.findMany({
    where: { phone: { contains: digits(phone).slice(-8) } },
    select: USER_SELECT,
    take: 10,
  });
  const target = candidates.find((u) => u.isActive && phonesMatch(u.phone, phone) && CLIENT_ROLES.includes(String(u.role)));
  if (!target) {
    throw new Error("Não encontrámos nenhuma conta com este número. Registe a pessoa como cliente novo.");
  }
  if (target.id === agentId) {
    throw new Error("Não pode convidar a sua própria conta.");
  }

  const [existing, total, today] = await Promise.all([
    prisma.agentClient.findUnique({ where: { agentId_clientId: { agentId, clientId: target.id } } }),
    prisma.agentClient.count({ where: { agentId, status: { in: ["ATIVO", "PENDENTE_ACEITACAO"] } } }),
    prisma.agentClient.count({ where: { agentId, origin: "CONVITE", createdAt: { gte: new Date(Date.now() - DAY) } } }),
  ]);

  if (existing?.status === "ATIVO") {
    throw new Error("Esta pessoa já está na sua carteira de clientes.");
  }
  if (existing?.status === "PENDENTE_ACEITACAO") {
    throw new Error("Já enviou um convite a esta pessoa. Espere pela resposta.");
  }
  if (existing && Date.now() - new Date(existing.updatedAt).getTime() < DAY) {
    throw new Error("Esta pessoa respondeu há pouco ao seu convite. Tente de novo amanhã.");
  }
  if (total >= MAX_CLIENTS) {
    throw new Error(`Pode ter até ${MAX_CLIENTS} clientes.`);
  }
  if (today >= MAX_INVITES_PER_DAY) {
    throw new Error("Já enviou muitos convites hoje. Tente amanhã.");
  }

  const link = existing
    ? await prisma.agentClient.update({
        where: { id: existing.id },
        data: { status: "PENDENTE_ACEITACAO", endedAt: null, endedBy: null, consentAt: null, notes: clean(input?.notes, 500) ?? existing.notes },
      })
    : await prisma.agentClient.create({
        data: {
          agentId,
          clientId: target.id,
          origin: "CONVITE",
          status: "PENDENTE_ACEITACAO",
          consentMode: "APP",
          notes: clean(input?.notes, 500),
        },
      });

  const name = await agentName(agentId);
  await logActivity(agentId, target.id, "CONVITE", "Convite enviado");
  await notify(
    target.id,
    "Convite de um agente",
    `${name} (agente) quer ajudá-lo a usar o NÔDJUNTA AGRO. Aceite ou recuse em Configurações, Os meus agentes.`,
    link.id
  );

  return { id: link.id, client: clientShape(target) };
}

// =====================================================================
// A carteira de clientes do agente
// =====================================================================
export async function listClients(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; kind?: string; q?: string; region?: string }
) {
  assertAgent(role);

  const links = await prisma.agentClient.findMany({
    where: { agentId },
    orderBy: [{ lastContactAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 600,
  });

  const counts: Record<string, number> = { ATIVO: 0, PENDENTE_ACEITACAO: 0, REVOGADO: 0, RECUSADO: 0 };
  links.forEach((l) => (counts[l.status] = (counts[l.status] ?? 0) + 1));

  const wantedStatuses = filters.status ? [filters.status] : ["ATIVO", "PENDENTE_ACEITACAO"];
  const shown = links.filter((l) => wantedStatuses.includes(l.status));
  const ids = shown.map((l) => l.clientId);

  const [users, lastActs, openOrders] = ids.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids } }, select: USER_SELECT }),
        prisma.agentActivity.groupBy({ by: ["clientId"], where: { agentId, clientId: { in: ids } }, _max: { createdAt: true } }),
        openOrdersByUser(ids),
      ])
    : [[], [], new Map<string, number>()];

  const userMap = new Map((users as any[]).map((u) => [u.id, u]));
  const actMap = new Map((lastActs as any[]).map((a) => [a.clientId, a._max.createdAt]));

  const needle = plain(filters.q);
  const items = shown
    .map((l) => {
      const user = userMap.get(l.clientId);
      return user
        ? {
            id: l.id,
            status: l.status,
            origin: l.origin,
            consentMode: l.consentMode,
            notes: l.notes,
            lastContactAt: l.lastContactAt,
            lastActivityAt: actMap.get(l.clientId) ?? null,
            openOrders: (openOrders as Map<string, number>).get(l.clientId) ?? 0,
            createdAt: l.createdAt,
            client: clientShape(user),
          }
        : null;
    })
    .filter((i): i is NonNullable<typeof i> => !!i)
    .filter((i) => !filters.kind || i.client.role === filters.kind)
    .filter((i) => !filters.region || i.client.regionKey === filters.region)
    .filter((i) => !needle || plain(`${i.client.name} ${i.client.phone} ${i.client.location}`).includes(needle));

  const byKind: Record<string, number> = {};
  links
    .filter((l) => l.status === "ATIVO")
    .forEach((l) => {
      const role2 = String((userMap.get(l.clientId) as any)?.role ?? "");
      if (role2) byKind[role2] = (byKind[role2] ?? 0) + 1;
    });

  return { counts: { ...counts, total: links.length }, byKind, items };
}

export async function getClient(agentId: string, role: string | undefined, linkId: string) {
  assertAgent(role);
  const link = await ownLink(agentId, linkId);

  const client = await prisma.user.findUnique({ where: { id: link.clientId }, select: USER_SELECT });
  if (!client) {
    throw new Error("Cliente não encontrado.");
  }

  const [activities, sessions, profile, openOrders] = await Promise.all([
    prisma.agentActivity.findMany({ where: { agentId, clientId: client.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.agentSession.findMany({ where: { agentId, clientId: client.id }, orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.agentProfile.findUnique({ where: { userId: agentId } }),
    openOrdersByUser([client.id]),
  ]);

  let products = 0;
  try {
    products = await prisma.product.count({ where: { ownerId: client.id } });
  } catch (error) {
    console.error("agent: contagem de produtos", error);
  }

  return {
    link: {
      id: link.id,
      status: link.status,
      origin: link.origin,
      consentMode: link.consentMode,
      consentAt: link.consentAt,
      notes: link.notes,
      lastContactAt: link.lastContactAt,
      endedAt: link.endedAt,
      endedBy: link.endedBy,
      createdAt: link.createdAt,
    },
    client: clientShape(client),
    stats: { products, openOrders: openOrders.get(client.id) ?? 0 },
    canAssist: link.status === "ATIVO" && !!profile && profile.status === "APROVADO" && profile.canAssist,
    activities,
    sessions,
  };
}

export async function updateNotes(agentId: string, role: string | undefined, linkId: string, notes: any) {
  assertAgent(role);
  const link = await ownLink(agentId, linkId);

  await prisma.agentClient.update({ where: { id: link.id }, data: { notes: clean(notes, 500) } });
  return getClient(agentId, role, linkId);
}

// O agente deixa de acompanhar a pessoa
export async function removeClient(agentId: string, role: string | undefined, linkId: string) {
  assertAgent(role);
  const link = await ownLink(agentId, linkId);

  if (link.status === "REVOGADO" || link.status === "RECUSADO") {
    throw new Error("Esta pessoa já não está na sua carteira.");
  }

  await prisma.agentClient.update({ where: { id: link.id }, data: { status: "REVOGADO", endedAt: new Date(), endedBy: "AGENTE" } });
  await prisma.agentSession.updateMany({ where: { agentId, clientId: link.clientId, endedAt: null }, data: { endedAt: new Date() } });
  forgetAssistCache();

  const name = await agentName(agentId);
  await logActivity(agentId, link.clientId, "NOTA", "O agente deixou de acompanhar esta pessoa");
  await notify(link.clientId, "Agente deixou de o acompanhar", `${name} deixou de o acompanhar no NÔDJUNTA AGRO.`, link.id);

  return { id: link.id, removed: true };
}

// =====================================================================
// Histórico de atendimento
// =====================================================================
export async function addActivity(agentId: string, role: string | undefined, linkId: string, input: any) {
  assertAgent(role);
  const link = await ownLink(agentId, linkId);
  if (link.status !== "ATIVO") {
    throw new Error("Só pode registar atendimentos de clientes ativos.");
  }

  const kind = String(input?.kind ?? "NOTA");
  if (!MANUAL_ACTIVITY_KINDS.includes(kind)) {
    throw new Error("Tipo de registo inválido.");
  }

  const via = clean(input?.via, 30);
  let message = clean(input?.message, 600);
  if (!message) {
    if (kind === "CONTACTO") message = via ? `Contacto por ${via}` : "Contacto";
    else throw new Error("Escreva o que aconteceu.");
  }

  await logActivity(agentId, link.clientId, kind, message, { isPrivate: Boolean(input?.isPrivate) });

  if (kind === "CONTACTO" || kind === "VISITA" || kind === "ATENDIMENTO") {
    await prisma.agentClient.update({ where: { id: link.id }, data: { lastContactAt: new Date() } });
  }

  return getClient(agentId, role, linkId);
}

export async function listActivities(
  agentId: string,
  role: string | undefined,
  filters: { linkId?: string; kind?: string; limit?: number }
) {
  assertAgent(role);

  const where: any = { agentId };
  if (filters.linkId) {
    const link = await ownLink(agentId, filters.linkId);
    where.clientId = link.clientId;
  }
  if (filters.kind) where.kind = filters.kind;

  const items = await prisma.agentActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(10, Math.floor(filters.limit ?? 100))),
  });

  const clientIds = Array.from(new Set(items.map((a) => a.clientId).filter(Boolean))) as string[];
  const users = clientIds.length ? await prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  return items.map((a) => ({ ...a, clientName: a.clientId ? names.get(a.clientId) ?? null : null }));
}

// =====================================================================
// Do lado da pessoa ajudada: os meus agentes
// =====================================================================
export async function myAgents(userId: string) {
  const links = await prisma.agentClient.findMany({ where: { clientId: userId }, orderBy: { updatedAt: "desc" }, take: 50 });
  if (links.length === 0) return [];

  const agentIds = links.map((l) => l.agentId);
  const [users, profiles, ratings, acts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, phone: true, photoUrl: true, isVerified: true } }),
    prisma.agentProfile.findMany({ where: { userId: { in: agentIds } } }),
    prisma.agentRating.findMany({ where: { authorId: userId, agentId: { in: agentIds } } }),
    prisma.agentActivity.groupBy({ by: ["agentId"], where: { clientId: userId, agentId: { in: agentIds }, isPrivate: false }, _max: { createdAt: true } }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const ratingMap = new Map(ratings.map((r) => [r.agentId, r]));
  const actMap = new Map(acts.map((a) => [a.agentId, a._max.createdAt]));

  return links.map((l) => {
    const user = userMap.get(l.agentId);
    const profile = profileMap.get(l.agentId);
    return {
      id: l.id,
      status: l.status,
      origin: l.origin,
      consentMode: l.consentMode,
      createdAt: l.createdAt,
      endedBy: l.endedBy,
      lastActivityAt: actMap.get(l.agentId) ?? null,
      agent: {
        id: l.agentId,
        name: user?.name ?? "Agente",
        photoUrl: user?.photoUrl ?? null,
        isVerified: !!user?.isVerified,
        phone: l.status === "ATIVO" ? user?.phone ?? null : null,
        agentType: profile?.agentType ?? null,
        regions: profile?.regions ?? [],
      },
      myRating: ratingMap.get(l.agentId)?.rating ?? null,
    };
  });
}

async function myLink(userId: string, linkId: string) {
  const link = await prisma.agentClient.findUnique({ where: { id: linkId } });
  if (!link || link.clientId !== userId) {
    throw new Error("Agente não encontrado.");
  }
  return link;
}

export async function respondInvite(userId: string, linkId: string, accept: boolean) {
  const link = await myLink(userId, linkId);
  if (link.status !== "PENDENTE_ACEITACAO") {
    throw new Error("Este convite já foi respondido.");
  }

  await prisma.agentClient.update({
    where: { id: link.id },
    data: accept
      ? { status: "ATIVO", consentAt: new Date() }
      : { status: "RECUSADO", endedAt: new Date(), endedBy: "CLIENTE" },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await logActivity(link.agentId, userId, "CONVITE", accept ? "Convite aceite" : "Convite recusado");
  await notify(
    link.agentId,
    accept ? "Convite aceite" : "Convite recusado",
    `${user?.name ?? "A pessoa"} ${accept ? "aceitou" : "recusou"} o seu convite.`,
    link.id
  );

  return myAgents(userId);
}

// A pessoa retira o acesso ao agente, a qualquer momento
export async function revokeAgent(userId: string, linkId: string) {
  const link = await myLink(userId, linkId);
  if (link.status === "REVOGADO" || link.status === "RECUSADO") {
    throw new Error("Este acesso já foi retirado.");
  }

  await prisma.agentClient.update({
    where: { id: link.id },
    data: { status: link.status === "PENDENTE_ACEITACAO" ? "RECUSADO" : "REVOGADO", endedAt: new Date(), endedBy: "CLIENTE" },
  });
  await prisma.agentSession.updateMany({ where: { agentId: link.agentId, clientId: userId, endedAt: null }, data: { endedAt: new Date() } });
  forgetAssistCache();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await logActivity(link.agentId, userId, "NOTA", "A pessoa retirou o acesso ao agente");
  await notify(link.agentId, "Acesso retirado", `${user?.name ?? "A pessoa"} retirou o seu acesso à conta.`, link.id);

  return myAgents(userId);
}

// O que o agente fez na minha conta (sem as notas privadas dele)
export async function myAgentActivity(userId: string, linkId: string) {
  const link = await myLink(userId, linkId);

  const [activities, sessions] = await Promise.all([
    prisma.agentActivity.findMany({
      where: { agentId: link.agentId, clientId: userId, isPrivate: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.agentSession.findMany({ where: { agentId: link.agentId, clientId: userId }, orderBy: { startedAt: "desc" }, take: 20 }),
  ]);

  return { activities, sessions };
}

export async function rateAgent(userId: string, linkId: string, input: any) {
  const link = await myLink(userId, linkId);
  if (!link.consentAt) {
    throw new Error("Só pode avaliar um agente depois de aceitar o acompanhamento.");
  }

  const rating = Math.floor(Number(input?.rating));
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("A avaliação deve ser de 1 a 5 estrelas.");
  }
  const comment = clean(input?.comment, 300);

  await prisma.agentRating.upsert({
    where: { agentId_authorId: { agentId: link.agentId, authorId: userId } },
    create: { agentId: link.agentId, authorId: userId, rating, comment },
    update: { rating, comment },
  });

  return myAgents(userId);
}
