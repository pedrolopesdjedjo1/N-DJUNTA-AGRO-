import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { assertAgent, ensureProfile } from "./agentService";
import { inviteExistingUser } from "./agentClientService";

const PAGE_SIZE = 30;
const PRODUCER_ROLES = ["AGRICULTOR", "PESCADOR", "ARTESANO", "COMERCIANTE"];
const KIND_FIELD: Record<string, string> = {
  AGRICULTOR: "farmers",
  PESCADOR: "fishers",
  ARTESANO: "artisans",
  ARTESAO: "artisans",
  COMERCIANTE: "merchants",
};

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// =====================================================================
// Produtores e comerciantes da plataforma (sem telefones)
// =====================================================================
export async function listProducers(
  agentId: string,
  role: string | undefined,
  filters: { kind?: string; region?: string; q?: string; scope?: string; page?: number }
) {
  assertAgent(role);

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: PRODUCER_ROLES as any } },
    select: { id: true, name: true, role: true, location: true, isVerified: true, photoUrl: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const links = await prisma.agentClient.findMany({ where: { agentId }, select: { id: true, clientId: true, status: true } });
  const linkMap = new Map(links.map((l) => [l.clientId, l]));

  const needle = plain(filters.q);
  let list = users
    .map((u) => ({ ...u, role: String(u.role), regionKey: findRegion(u.location)?.key ?? null }))
    .filter((u) => !filters.region || u.regionKey === filters.region)
    .filter((u) => !needle || plain(`${u.name} ${u.location}`).includes(needle));

  const byKind: Record<string, number> = {};
  list.forEach((u) => (byKind[u.role] = (byKind[u.role] ?? 0) + 1));

  if (filters.kind) list = list.filter((u) => u.role === filters.kind);
  if (filters.scope === "mine") list = list.filter((u) => linkMap.get(u.id)?.status === "ATIVO");
  if (filters.scope === "free") list = list.filter((u) => !linkMap.has(u.id));

  list.sort((a, b) => Number(b.isVerified) - Number(a.isVerified) || a.name.localeCompare(b.name));

  const total = list.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = slice.length
    ? await prisma.product.groupBy({
        by: ["ownerId"],
        where: { ownerId: { in: slice.map((u) => u.id) }, isAvailable: true },
        _count: { _all: true },
      })
    : [];
  const productMap = new Map(counts.map((c) => [c.ownerId, c._count._all]));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    byKind,
    items: slice.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      location: u.location,
      regionKey: u.regionKey,
      isVerified: u.isVerified,
      photoUrl: u.photoUrl,
      createdAt: u.createdAt,
      productsCount: productMap.get(u.id) ?? 0,
      link: linkMap.get(u.id) ? { id: linkMap.get(u.id)!.id, status: linkMap.get(u.id)!.status } : null,
    })),
  };
}

// Convida uma pessoa da lista (o telefone nunca chega ao agente)
export async function inviteFromDirectory(agentId: string, role: string | undefined, userId: string, notes?: any) {
  assertAgent(role);

  const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { phone: true, isActive: true } });
  if (!user || !user.isActive) {
    throw new Error("Pessoa não encontrada.");
  }
  if (!user.phone) {
    throw new Error("Esta pessoa não tem telefone registado. Fale com ela pelas mensagens do app.");
  }

  const result = await inviteExistingUser(agentId, role, { phone: user.phone, notes });
  return { id: result.id, client: { ...result.client, phone: null } };
}

// =====================================================================
// Cooperativas
// =====================================================================
export async function listCooperatives(agentId: string, role: string | undefined, filters: { region?: string; q?: string }) {
  assertAgent(role);

  const coops: any[] = await prisma.cooperative.findMany({
    include: { _count: { select: { members: true } } },
    take: 500,
  });

  const leaderIds = Array.from(new Set(coops.map((c) => c.leaderId).filter(Boolean))) as string[];
  const leaders = leaderIds.length
    ? await prisma.user.findMany({ where: { id: { in: leaderIds } }, select: { id: true, name: true } })
    : [];
  const leaderMap = new Map(leaders.map((l) => [l.id, l.name]));

  const needle = plain(filters.q);
  const items = coops
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      region: c.region ?? null,
      regionKey: findRegion(c.region)?.key ?? null,
      members: c._count.members,
      leader: c.leaderId ? { id: c.leaderId, name: leaderMap.get(c.leaderId) ?? "Líder" } : null,
    }))
    .filter((c) => !filters.region || c.regionKey === filters.region)
    .filter((c) => !needle || plain(`${c.name} ${c.region}`).includes(needle))
    .sort((a, b) => b.members - a.members);

  return { total: items.length, items };
}

// =====================================================================
// Comunidades locais: números por região e por localidade
// =====================================================================
export async function getCommunities(agentId: string, role: string | undefined, filters: { region?: string }) {
  assertAgent(role);
  const profile = await ensureProfile(agentId);

  const [links, producers, coops, markets, needs] = await Promise.all([
    prisma.agentClient.findMany({ where: { agentId, status: "ATIVO" }, select: { clientId: true } }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: PRODUCER_ROLES as any } },
      select: { id: true, role: true, location: true },
      take: 20000,
    }),
    prisma.cooperative.findMany({ select: { region: true } }),
    prisma.govPlace.findMany({ where: { kind: "MERCADO", isPublic: true }, select: { region: true } }),
    prisma.agentNeed.findMany({ where: { agentId, status: { not: "ATENDIDA" } }, select: { regionKey: true } }),
  ]);

  const clientIds = links.map((l) => l.clientId);
  const clients = clientIds.length
    ? await prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, role: true, location: true } })
    : [];

  const rows = new Map<string, any>();
  REGIONS.forEach((r) =>
    rows.set(r.key, {
      key: r.key,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      mine: profile.regions.includes(r.key),
      farmers: 0,
      fishers: 0,
      artisans: 0,
      merchants: 0,
      cooperatives: 0,
      markets: 0,
      clients: 0,
      needs: 0,
    })
  );

  producers.forEach((u) => {
    const row = rows.get(findRegion(u.location)?.key ?? "");
    const field = KIND_FIELD[String(u.role)];
    if (row && field) row[field] += 1;
  });
  coops.forEach((c) => {
    const row = rows.get(findRegion(c.region)?.key ?? "");
    if (row) row.cooperatives += 1;
  });
  markets.forEach((m) => {
    const row = rows.get(findRegion(m.region)?.key ?? "");
    if (row) row.markets += 1;
  });
  needs.forEach((n) => {
    const row = rows.get(n.regionKey ?? "");
    if (row) row.needs += 1;
  });

  // Localidades dos clientes do agente
  const places = new Map<string, { name: string; regionKey: string | null; count: number; kinds: Record<string, number> }>();
  let unplaced = 0;
  clients.forEach((c) => {
    const regionKey = findRegion(c.location)?.key ?? null;
    const row = rows.get(regionKey ?? "");
    if (row) row.clients += 1;

    const name = (c.location ?? "").trim();
    if (!name) {
      unplaced += 1;
      return;
    }
    const key = plain(name);
    const place = places.get(key) ?? { name, regionKey, count: 0, kinds: {} };
    place.count += 1;
    place.kinds[String(c.role)] = (place.kinds[String(c.role)] ?? 0) + 1;
    places.set(key, place);
  });

  let localities = Array.from(places.values()).sort((a, b) => b.count - a.count);
  if (filters.region) localities = localities.filter((p) => p.regionKey === filters.region);

  return {
    regions: Array.from(rows.values()).sort((a, b) => Number(b.mine) - Number(a.mine) || b.clients - a.clients || a.name.localeCompare(b.name)),
    localities: localities.slice(0, 40),
    unplacedClients: unplaced,
  };
}
