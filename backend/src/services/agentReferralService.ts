import { prisma } from "../lib/prisma";
import { REFERRAL_TYPES } from "../lib/agentCatalog";
import { values } from "../lib/ngoCatalog";
import { findRegion } from "../lib/ngoRegions";
import { orgInfo } from "../lib/ngoOrgInfo";
import { assertAgent, requireApproved } from "./agentService";

const TYPE_VALUES = values(REFERRAL_TYPES);
const ROLE_AREAS: Record<string, string[]> = {
  AGRICULTOR: ["AGRICULTURA"],
  PESCADOR: ["PESCA"],
  ARTESAO: ["ARTESANATO"],
  COMERCIANTE: ["ARTESANATO", "COMERCIO"],
};

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function typeLabel(type: string): string {
  return REFERRAL_TYPES.find((t) => t.value === type)?.label ?? "Oportunidade";
}

// Confirma que a oportunidade, a formação ou o programa existe e ainda está aberto
async function loadTarget(type: string, refId: string): Promise<{ title: string }> {
  if (!refId) {
    throw new Error("Escolha o que quer indicar.");
  }

  if (type === "OPORTUNIDADE") {
    const o: any = await prisma.opportunity.findUnique({ where: { id: refId } });
    if (!o) throw new Error("Oportunidade não encontrada.");
    if (o.status !== "ABERTA" || (o.deadline && new Date(o.deadline).getTime() < Date.now())) {
      throw new Error("Esta oportunidade já está fechada.");
    }
    return { title: String(o.title) };
  }

  if (type === "FORMACAO") {
    const t: any = await prisma.training.findUnique({ where: { id: refId } });
    if (!t) throw new Error("Formação não encontrada.");
    const end = new Date(t.endsAt ?? t.startsAt).getTime();
    if (t.status === "CANCELADA" || end < Date.now()) throw new Error("Esta formação já terminou ou foi cancelada.");
    return { title: String(t.title) };
  }

  const p = await prisma.govProgram.findUnique({ where: { id: refId } });
  if (!p || !p.isPublic) throw new Error("Programa não encontrado.");
  if (p.status === "CONCLUIDO" || p.status === "CANCELADO") throw new Error("Este programa já terminou.");
  return { title: p.name };
}

// =====================================================================
// Oportunidades abertas, com as mais úteis para o cliente escolhido primeiro
// =====================================================================
export async function listOpportunitiesForAgent(
  agentId: string,
  role: string | undefined,
  filters: { kind?: string; area?: string; region?: string; q?: string; linkId?: string }
) {
  assertAgent(role);

  const where: any = { status: "ABERTA" };
  if (filters.kind) where.kind = filters.kind;
  if (filters.area) where.area = filters.area;

  const rows: any[] = await prisma.opportunity.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });

  let client: { id: string; role: string; regionKey: string | null } | null = null;
  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) {
      throw new Error("Cliente não encontrado.");
    }
    const user = await prisma.user.findUnique({ where: { id: link.clientId }, select: { id: true, role: true, location: true } });
    if (user) client = { id: user.id, role: String(user.role), regionKey: findRegion(user.location)?.key ?? null };
  }

  const needle = plain(filters.q);
  const regionWanted = filters.region ? plain(filters.region) : "";
  const now = Date.now();

  const open = rows
    .filter((o) => !o.deadline || new Date(o.deadline).getTime() >= now)
    .filter((o) => !regionWanted || !o.region || plain(o.region).includes(regionWanted) || regionWanted.includes(plain(o.region)))
    .filter((o) => !needle || plain(`${o.title} ${o.description}`).includes(needle));

  const [orgs, referred] = await Promise.all([
    orgInfo(open.map((o) => o.ownerId)),
    client && open.length
      ? prisma.agentActivity.findMany({
          where: { agentId, clientId: client.id, kind: "OPORTUNIDADE", relatedId: { in: open.map((o) => o.id) } },
          select: { relatedId: true },
        })
      : Promise.resolve([] as { relatedId: string | null }[]),
  ]);
  const referredSet = new Set(referred.map((r) => r.relatedId));

  const items = open.map((o) => {
    const areas = client ? ROLE_AREAS[client.role] ?? [] : [];
    const relevant =
      !!client &&
      (!o.area || areas.includes(o.area)) &&
      (!o.region || !client.regionKey || findRegion(o.region)?.key === client.regionKey);
    return {
      ...o,
      organization: orgs.get(o.ownerId) ?? null,
      relevant,
      referred: referredSet.has(o.id),
    };
  });

  items.sort((a, b) => Number(b.relevant) - Number(a.relevant) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { total: items.length, items };
}

// =====================================================================
// Indicar uma oportunidade, formação ou programa a clientes
// =====================================================================
export async function refer(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await requireApproved(agentId);

  const type = String(input?.type ?? "");
  if (!TYPE_VALUES.includes(type)) {
    throw new Error("Escolha o que quer indicar.");
  }

  const refId = String(input?.refId ?? "");
  const target = await loadTarget(type, refId);

  const linkIds: string[] = Array.isArray(input?.linkIds) ? Array.from(new Set(input.linkIds.map(String))).slice(0, 50) as string[] : [];
  if (linkIds.length === 0) {
    throw new Error("Escolha pelo menos uma pessoa.");
  }

  const links = await prisma.agentClient.findMany({ where: { id: { in: linkIds }, agentId, status: "ATIVO" } });
  if (links.length === 0) {
    throw new Error("Escolha clientes ativos da sua carteira.");
  }

  const clientIds = links.map((l) => l.clientId);
  const done = await prisma.agentActivity.findMany({
    where: { agentId, kind: "OPORTUNIDADE", relatedId: refId, clientId: { in: clientIds } },
    select: { clientId: true },
  });
  const skip = new Set(done.map((d) => d.clientId));
  const fresh = clientIds.filter((id) => !skip.has(id));

  if (fresh.length === 0) {
    throw new Error("Já indicou isto a todas as pessoas escolhidas.");
  }

  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  const note = clean(input?.message, 300);
  const label = typeLabel(type);

  await prisma.notification.createMany({
    data: fresh.map((userId) => ({
      userId,
      type: "SISTEMA" as const,
      title: "Uma oportunidade para si",
      message: `${agent?.name ?? "O seu agente"} indicou: ${label}, ${target.title}${note ? `. ${note}` : ""}`.slice(0, 300),
      relatedId: refId,
    })),
  });

  await prisma.agentActivity.createMany({
    data: fresh.map((clientId) => ({
      agentId,
      clientId,
      kind: "OPORTUNIDADE",
      message: `${label}: ${target.title}`,
      relatedId: refId,
    })),
  });

  return { sent: fresh.length, skipped: clientIds.length - fresh.length, title: target.title };
}

// O que já indiquei, agrupado por oportunidade
export async function listReferrals(agentId: string, role: string | undefined) {
  assertAgent(role);

  const rows = await prisma.agentActivity.findMany({
    where: { agentId, kind: "OPORTUNIDADE", NOT: { relatedId: null } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const clientIds = Array.from(new Set(rows.map((r) => r.clientId).filter(Boolean))) as string[];
  const users = clientIds.length ? await prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  const groups = new Map<string, { refId: string; title: string; lastAt: Date; clients: string[] }>();
  rows.forEach((r) => {
    const refId = String(r.relatedId);
    const group = groups.get(refId) ?? { refId, title: r.message ?? "Oportunidade", lastAt: r.createdAt, clients: [] };
    const name = r.clientId ? names.get(r.clientId) : null;
    if (name && !group.clients.includes(name)) group.clients.push(name);
    groups.set(refId, group);
  });

  return Array.from(groups.values());
}
