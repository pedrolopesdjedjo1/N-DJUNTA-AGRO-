import { prisma } from "../lib/prisma";
import { AGENT_AREAS, AGENT_DOCUMENT_KINDS, AGENT_STATUS, AGENT_TYPES } from "../lib/agentCatalog";
import { values } from "../lib/ngoCatalog";
import { REGIONS } from "../lib/ngoRegions";
import { forgetAssistCache } from "../middleware/assistGuard";

const TYPE_VALUES = values(AGENT_TYPES);
const AREA_VALUES = values(AGENT_AREAS);
const DOC_VALUES = values(AGENT_DOCUMENT_KINDS);
const STATUS_VALUES = values(AGENT_STATUS);
const REGION_KEYS = REGIONS.map((r) => r.key);
const MAX_DOCUMENTS = 8;
const DECISIONS = ["APROVAR", "RECUSAR", "SUSPENDER", "REATIVAR", "AJUSTAR"];

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function validStorageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

function readPhone(value: any): string | null {
  const phone = clean(value, 20);
  if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
    throw new Error(`Telefone inválido: ${phone}`);
  }
  return phone;
}

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function assertAgent(role?: string) {
  if (role !== "AGENTE") {
    throw new Error("Esta área é reservada aos agentes.");
  }
}

export function assertAdmin(role?: string) {
  if (role !== "ADMIN") {
    throw new Error("Acesso restrito à equipa do NÔDJUNTA AGRO.");
  }
}

async function notifyAdmins(title: string, message: string, relatedId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "SISTEMA" as const, title, message, relatedId })),
  });
}

export async function ensureProfile(userId: string) {
  const found = await prisma.agentProfile.findUnique({ where: { userId } });
  if (found) return found;
  return prisma.agentProfile.create({ data: { userId } });
}

// Só agentes aprovados (e com a permissão certa) podem registar pessoas ou ajudar nas contas
export async function requireApproved(userId: string, need: "any" | "register" | "assist" = "any") {
  const profile = await ensureProfile(userId);

  if (profile.status === "SUSPENSO") {
    throw new Error("A sua conta de agente está suspensa. Fale com a equipa do NÔDJUNTA AGRO.");
  }
  if (profile.status !== "APROVADO") {
    throw new Error("A sua conta de agente ainda não foi aprovada. Complete o perfil e envie-o para verificação.");
  }
  if (need === "register" && !profile.canRegister) {
    throw new Error("A sua conta não tem permissão para registar pessoas. Fale com a equipa.");
  }
  if (need === "assist" && !profile.canAssist) {
    throw new Error("A sua conta não tem permissão para ajudar nas contas das pessoas. Fale com a equipa.");
  }
  return profile;
}

export async function ratingOf(agentId: string) {
  const agg = await prisma.agentRating.aggregate({ where: { agentId }, _avg: { rating: true }, _count: { _all: true } });
  return {
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count._all,
  };
}

function checklist(profile: any, user: any, documents: any[]) {
  const items = [
    { key: "name", label: "Nome", done: !!user.name && user.name.trim().length >= 2 },
    { key: "photo", label: "Foto de perfil", done: !!user.photoUrl },
    { key: "phone", label: "Telefone", done: !!user.phone },
    { key: "areas", label: "Pelo menos uma área de atuação", done: profile.areas.length > 0 },
    { key: "regions", label: "Pelo menos uma região onde atua", done: profile.regions.length > 0 },
    { key: "document", label: "Documento de identificação", done: documents.some((d) => d.kind === "IDENTIFICACAO") },
  ];
  return { items, canSubmit: items.every((i) => i.done), missing: items.filter((i) => !i.done).map((i) => i.label) };
}

// =====================================================================
// O meu perfil de agente
// =====================================================================
export async function getMyProfile(userId: string, role?: string) {
  assertAgent(role);
  const profile = await ensureProfile(userId);

  const [user, documents, links, rating] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true },
    }),
    prisma.agentDocument.findMany({ where: { agentId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.agentClient.groupBy({ by: ["status"], where: { agentId: userId }, _count: { _all: true } }),
    ratingOf(userId),
  ]);
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }

  const counts: Record<string, number> = {};
  links.forEach((l) => (counts[l.status] = l._count._all));

  return {
    profile,
    user,
    documents,
    checklist: checklist(profile, user, documents),
    rating,
    stats: {
      activeClients: counts.ATIVO ?? 0,
      pendingInvites: counts.PENDENTE_ACEITACAO ?? 0,
      totalClients: Object.values(counts).reduce((s, n) => s + n, 0),
    },
  };
}

export async function saveProfile(userId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await ensureProfile(userId);

  const data: any = {};

  if (input?.agentType !== undefined) {
    if (!TYPE_VALUES.includes(String(input.agentType))) {
      throw new Error("Escolha o tipo de agente.");
    }
    data.agentType = String(input.agentType);
  }

  if (Array.isArray(input?.areas)) {
    data.areas = Array.from(new Set(input.areas.map(String).filter((a: string) => AREA_VALUES.includes(a)))).slice(0, 5);
  }

  if (Array.isArray(input?.regions)) {
    const wanted = Array.from(new Set(input.regions.map(String))) as string[];
    if (!wanted.every((r) => REGION_KEYS.includes(r))) {
      throw new Error("Região inválida.");
    }
    data.regions = wanted.slice(0, 12);
  }

  if (input?.bio !== undefined) data.bio = clean(input.bio, 600);
  if (input?.whatsapp !== undefined) data.whatsapp = readPhone(input.whatsapp);
  if (input?.serviceAddress !== undefined) data.serviceAddress = clean(input.serviceAddress, 200);
  if (input?.schedule !== undefined) data.schedule = clean(input.schedule, 200);

  if (input?.serviceLat !== undefined || input?.serviceLng !== undefined) {
    const has = (v: any) => v !== undefined && v !== null && v !== "";
    if (!has(input.serviceLat) && !has(input.serviceLng)) {
      data.serviceLat = null;
      data.serviceLng = null;
    } else {
      const lat = Number(input.serviceLat);
      const lng = Number(input.serviceLng);
      if (!has(input.serviceLat) || !has(input.serviceLng) || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error("Coordenadas inválidas.");
      }
      data.serviceLat = lat;
      data.serviceLng = lng;
    }
  }

  const userData: any = {};
  if (input?.name !== undefined) {
    const name = clean(input.name, 120);
    if (!name || name.length < 2) {
      throw new Error("Escreva o seu nome.");
    }
    userData.name = name;
  }
  if (input?.location !== undefined) userData.location = clean(input.location, 120);
  if (input?.photoUrl !== undefined) {
    if (input.photoUrl && !validStorageUrl(input.photoUrl)) {
      throw new Error("Foto inválida.");
    }
    userData.photoUrl = input.photoUrl || null;
  }

  if (Object.keys(data).length > 0) {
    await prisma.agentProfile.update({ where: { userId }, data });
  }
  if (Object.keys(userData).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: userData });
  }

  return getMyProfile(userId, role);
}

export async function addDocument(userId: string, role: string | undefined, input: any) {
  assertAgent(role);

  const kind = String(input?.kind ?? "");
  if (!DOC_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de documento.");
  }
  const name = clean(input?.name, 100);
  if (!name) {
    throw new Error("Escreva o nome do documento.");
  }
  if (!validStorageUrl(input?.url)) {
    throw new Error("Ficheiro inválido. Envie o documento pelo app.");
  }

  const count = await prisma.agentDocument.count({ where: { agentId: userId } });
  if (count >= MAX_DOCUMENTS) {
    throw new Error(`Pode guardar até ${MAX_DOCUMENTS} documentos.`);
  }

  await prisma.agentDocument.create({ data: { agentId: userId, kind, name, url: input.url } });
  return getMyProfile(userId, role);
}

export async function deleteDocument(userId: string, role: string | undefined, id: string) {
  assertAgent(role);

  const found = await prisma.agentDocument.findUnique({ where: { id } });
  if (!found || found.agentId !== userId) {
    throw new Error("Documento não encontrado.");
  }

  await prisma.agentDocument.delete({ where: { id } });
  return getMyProfile(userId, role);
}

export async function submitForApproval(userId: string, role?: string) {
  assertAgent(role);
  const profile = await ensureProfile(userId);

  if (profile.status === "PENDENTE") {
    throw new Error("O seu perfil já foi enviado e está a ser analisado.");
  }
  if (profile.status === "APROVADO") {
    throw new Error("O seu perfil já está aprovado.");
  }
  if (profile.status === "SUSPENSO") {
    throw new Error("A sua conta está suspensa. Fale com a equipa do NÔDJUNTA AGRO.");
  }

  const [user, documents] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true, photoUrl: true } }),
    prisma.agentDocument.findMany({ where: { agentId: userId } }),
  ]);
  const check = checklist(profile, user, documents);
  if (!check.canSubmit) {
    throw new Error(`Complete antes de enviar: ${check.missing.join(", ")}.`);
  }

  await prisma.agentProfile.update({
    where: { userId },
    data: { status: "PENDENTE", submittedAt: new Date(), statusNote: null },
  });
  await notifyAdmins("Novo agente para aprovar", `${user?.name ?? "Um agente"} enviou o perfil para verificação.`, profile.id);

  return getMyProfile(userId, role);
}

// =====================================================================
// Cartão público do agente (visto pelos clientes)
// =====================================================================
export async function getPublicAgent(viewerId: string, viewerRole: string | undefined, agentUserId: string) {
  const profile = await prisma.agentProfile.findUnique({ where: { userId: agentUserId } });
  const self = viewerId === agentUserId;
  const admin = viewerRole === "ADMIN";

  if (!profile || (profile.status !== "APROVADO" && !self && !admin)) {
    throw new Error("Agente não encontrado.");
  }

  const [user, rating, link, served] = await Promise.all([
    prisma.user.findUnique({
      where: { id: agentUserId },
      select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true },
    }),
    ratingOf(agentUserId),
    prisma.agentClient.findUnique({ where: { agentId_clientId: { agentId: agentUserId, clientId: viewerId } } }),
    prisma.agentClient.count({ where: { agentId: agentUserId, status: "ATIVO" } }),
  ]);
  if (!user) {
    throw new Error("Agente não encontrado.");
  }

  const canSeePhone = self || admin || link?.status === "ATIVO";

  return {
    agent: {
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      location: user.location,
      isVerified: user.isVerified,
      phone: canSeePhone ? user.phone : null,
      whatsapp: canSeePhone ? profile.whatsapp : null,
      agentType: profile.agentType,
      areas: profile.areas,
      regions: profile.regions,
      bio: profile.bio,
      serviceAddress: profile.serviceAddress,
      serviceLat: profile.serviceLat,
      serviceLng: profile.serviceLng,
      schedule: profile.schedule,
      status: profile.status,
    },
    rating,
    peopleServed: served,
    myLink: link ? { id: link.id, status: link.status } : null,
  };
}

// =====================================================================
// Equipa do app: aprovar agentes
// =====================================================================
export async function listAgentsAdmin(role: string | undefined, filters: { status?: string; q?: string }) {
  assertAdmin(role);

  const where: any = {};
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;

  const [profiles, groups] = await Promise.all([
    prisma.agentProfile.findMany({ where, orderBy: [{ submittedAt: "asc" }, { createdAt: "desc" }], take: 200 }),
    prisma.agentProfile.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const ids = profiles.map((p) => p.userId);
  const [users, documents, clients] = ids.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true } }),
        prisma.agentDocument.findMany({ where: { agentId: { in: ids } }, orderBy: { createdAt: "desc" } }),
        prisma.agentClient.groupBy({ by: ["agentId"], where: { agentId: { in: ids }, status: "ATIVO" }, _count: { _all: true } }),
      ])
    : [[], [], []];

  const userMap = new Map((users as any[]).map((u) => [u.id, u]));
  const clientMap = new Map((clients as any[]).map((c) => [c.agentId, c._count._all]));

  const needle = plain(filters.q);
  const items = profiles
    .map((p) => ({
      profile: p,
      user: userMap.get(p.userId) ?? null,
      documents: (documents as any[]).filter((d) => d.agentId === p.userId),
      activeClients: clientMap.get(p.userId) ?? 0,
    }))
    .filter((i) => !needle || plain(`${i.user?.name} ${i.user?.phone}`).includes(needle));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  return { counts, items };
}

export async function reviewAgent(role: string | undefined, adminId: string, agentUserId: string, input: any) {
  assertAdmin(role);

  const decision = String(input?.decision ?? "");
  if (!DECISIONS.includes(decision)) {
    throw new Error("Decisão inválida.");
  }

  const profile = await prisma.agentProfile.findUnique({ where: { userId: agentUserId } });
  if (!profile) {
    throw new Error("Agente não encontrado.");
  }

  const note = clean(input?.note, 500);
  const data: any = {};

  if (input?.canRegister !== undefined) data.canRegister = Boolean(input.canRegister);
  if (input?.canAssist !== undefined) data.canAssist = Boolean(input.canAssist);
  if (input?.commissionRate !== undefined) {
    const rate = Number(String(input.commissionRate).replace(",", "."));
    if (isNaN(rate) || rate < 0 || rate > 30) {
      throw new Error("A comissão deve ser um número entre 0 e 30 por cento.");
    }
    data.commissionRate = rate;
  }

  let title = "";
  let message = "";
  let verified: boolean | null = null;

  if (decision === "APROVAR") {
    if (profile.status !== "PENDENTE") throw new Error("Só se aprova um perfil que está em análise.");
    data.status = "APROVADO";
    data.statusNote = note;
    verified = true;
    title = "Conta de agente aprovada ✅";
    message = "Já pode registar pessoas e ajudar nas contas dos seus clientes.";
  } else if (decision === "RECUSAR") {
    if (profile.status !== "PENDENTE") throw new Error("Só se recusa um perfil que está em análise.");
    if (!note || note.length < 3) throw new Error("Explique o motivo da recusa.");
    data.status = "RECUSADO";
    data.statusNote = note;
    verified = false;
    title = "Perfil de agente recusado";
    message = `Motivo: ${note}. Corrija e envie de novo.`;
  } else if (decision === "SUSPENDER") {
    if (profile.status !== "APROVADO") throw new Error("Só se suspende um agente aprovado.");
    if (!note || note.length < 3) throw new Error("Explique o motivo da suspensão.");
    data.status = "SUSPENSO";
    data.statusNote = note;
    verified = false;
    title = "Conta de agente suspensa";
    message = `Motivo: ${note}. Fale com a equipa do NÔDJUNTA AGRO.`;
  } else if (decision === "REATIVAR") {
    if (profile.status !== "SUSPENSO") throw new Error("Só se reativa um agente suspenso.");
    data.status = "APROVADO";
    data.statusNote = note;
    verified = true;
    title = "Conta de agente reativada ✅";
    message = "A sua conta de agente voltou a estar ativa.";
  } else {
    if (profile.status !== "APROVADO") throw new Error("Só se ajustam as permissões de um agente aprovado.");
    if (Object.keys(data).length === 0) throw new Error("Nada para ajustar.");
    title = "Permissões de agente atualizadas";
    message = "A equipa do NÔDJUNTA AGRO atualizou as permissões da sua conta de agente.";
  }

  await prisma.agentProfile.update({
    where: { userId: agentUserId },
    data: { ...data, reviewedAt: new Date(), reviewedBy: adminId },
  });

  if (verified !== null) {
    await prisma.user.update({ where: { id: agentUserId }, data: { isVerified: verified } });
  }

  // Quem é suspenso ou deixa de poder ajudar perde já as sessões abertas
  if (decision === "SUSPENDER" || data.canAssist === false) {
    await prisma.agentSession.updateMany({ where: { agentId: agentUserId, endedAt: null }, data: { endedAt: new Date() } });
    forgetAssistCache();
  }

  await prisma.notification.create({
    data: { userId: agentUserId, type: "SISTEMA", title, message, relatedId: profile.id },
  });

  return { userId: agentUserId, decision };
}
