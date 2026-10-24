import { prisma } from "../lib/prisma";
import { REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { clientScope } from "../lib/agentScope";
import { assertAgent, ensureProfile } from "./agentService";

const BOUNDS = { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 };
const MAP_ROLES = ["AGRICULTOR", "PESCADOR", "ARTESANO", "COMERCIANTE", "TRANSPORTADOR"];
const ROLE_FIELD: Record<string, string> = {
  AGRICULTOR: "farmers",
  PESCADOR: "fishers",
  ARTESANO: "artisans",
  ARTESAO: "artisans",
  COMERCIANTE: "merchants",
  TRANSPORTADOR: "transporters",
};

function spot(lat: number | null | undefined, lng: number | null | undefined, text: string | null | undefined) {
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    return { lat, lng, approximate: false, region: nearestRegion(lat, lng)?.name ?? text ?? null };
  }
  const region = findRegion(text);
  if (region) {
    return { lat: region.lat, lng: region.lng, approximate: true, region: region.name };
  }
  return null;
}

// Mapa do agente: clientes, mercados, serviços, pontos de atendimento e cooperativas, com números por região
export async function getAgentMap(agentId: string, role: string | undefined, filters: { layers?: string }) {
  assertAgent(role);
  const profile = await ensureProfile(agentId);

  const wanted = new Set(
    (filters.layers ?? "clients,markets,services,agents,cooperatives")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const scope = await clientScope(agentId);

  const [clients, people, coops, markets, services, agentProfiles, needs] = await Promise.all([
    scope.ids.length
      ? prisma.user.findMany({
          where: { id: { in: scope.ids } },
          select: { id: true, name: true, role: true, location: true, photoUrl: true, isVerified: true, phone: true },
        })
      : Promise.resolve([] as any[]),
    prisma.user.findMany({ where: { isActive: true, role: { in: MAP_ROLES as any } }, select: { id: true, role: true, location: true }, take: 20000 }),
    prisma.cooperative.findMany({ select: { id: true, name: true, region: true }, take: 500 }),
    prisma.govPlace.findMany({
      where: { kind: "MERCADO", isPublic: true },
      select: { id: true, name: true, subtype: true, region: true, lat: true, lng: true, status: true, schedule: true },
      take: 500,
    }),
    prisma.publicService.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, category: true, region: true, address: true, lat: true, lng: true, status: true, schedule: true },
      take: 800,
    }),
    prisma.agentProfile.findMany({
      where: { status: "APROVADO" },
      select: { userId: true, agentType: true, regions: true, serviceAddress: true, serviceLat: true, serviceLng: true, schedule: true },
      take: 500,
    }),
    prisma.agentNeed.findMany({ where: { agentId, status: { not: "ATENDIDA" } }, select: { regionKey: true } }),
  ]);

  const rows = new Map<string, any>();
  REGIONS.forEach((r) =>
    rows.set(r.key, {
      key: r.key,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      mine: profile.regions.includes(r.key),
      clients: 0,
      farmers: 0,
      fishers: 0,
      artisans: 0,
      merchants: 0,
      transporters: 0,
      cooperatives: 0,
      markets: 0,
      services: 0,
      agents: 0,
      needs: 0,
    })
  );
  const bump = (text: string | null | undefined, field: string) => {
    const row = rows.get(findRegion(text)?.key ?? "");
    if (row) row[field] += 1;
  };

  people.forEach((u) => {
    const field = ROLE_FIELD[String(u.role)];
    if (field) bump(u.location, field);
  });
  (clients as any[]).forEach((c) => bump(c.location, "clients"));
  coops.forEach((c) => bump(c.region, "cooperatives"));
  markets.forEach((m) => bump(m.region, "markets"));
  services.forEach((s) => bump(s.region ?? s.address, "services"));
  needs.forEach((n) => {
    const row = rows.get(n.regionKey ?? "");
    if (row) row.needs += 1;
  });

  const agentIds = agentProfiles.map((a) => a.userId);
  const agentUsers = agentIds.length
    ? await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, photoUrl: true, isVerified: true } })
    : [];
  const agentMap = new Map(agentUsers.map((u) => [u.id, u]));

  const points: any[] = [];
  let unplaced = 0;

  if (wanted.has("clients")) {
    (clients as any[]).slice(0, 500).forEach((c) => {
      const s = spot(null, null, c.location);
      if (!s) {
        unplaced += 1;
        return;
      }
      points.push({
        layer: "clients",
        id: c.id,
        linkId: scope.linkByClient.get(c.id) ?? null,
        name: c.name,
        role: String(c.role),
        phone: c.phone ?? null,
        isVerified: !!c.isVerified,
        ...s,
      });
    });
  }

  if (wanted.has("markets")) {
    markets.forEach((m) => {
      const s = spot(m.lat, m.lng, m.region);
      if (!s) {
        unplaced += 1;
        return;
      }
      points.push({ layer: "markets", id: m.id, name: m.name, subtype: m.subtype, status: m.status, schedule: m.schedule, ...s });
    });
  }

  if (wanted.has("services")) {
    services.forEach((sv) => {
      const s = spot(sv.lat, sv.lng, sv.region ?? sv.address);
      if (!s) {
        unplaced += 1;
        return;
      }
      points.push({ layer: "services", id: sv.id, name: sv.name, category: sv.category, status: sv.status, schedule: sv.schedule, ...s });
    });
  }

  if (wanted.has("cooperatives")) {
    coops.forEach((c) => {
      const s = spot(null, null, c.region);
      if (!s) {
        unplaced += 1;
        return;
      }
      points.push({ layer: "cooperatives", id: c.id, name: c.name, ...s });
    });
  }

  // Pontos de atendimento: os dos agentes aprovados e o meu (mesmo antes de aprovado)
  if (wanted.has("agents")) {
    const list = [...agentProfiles];
    if (!list.some((a) => a.userId === agentId)) {
      list.push({
        userId: agentId,
        agentType: profile.agentType,
        regions: profile.regions,
        serviceAddress: profile.serviceAddress,
        serviceLat: profile.serviceLat,
        serviceLng: profile.serviceLng,
        schedule: profile.schedule,
      });
    }

    const meUser = list.some((a) => a.userId === agentId) && !agentMap.has(agentId)
      ? await prisma.user.findUnique({ where: { id: agentId }, select: { id: true, name: true, photoUrl: true, isVerified: true } })
      : null;
    if (meUser) agentMap.set(agentId, meUser);

    list.forEach((a) => {
      const hasPoint = a.serviceLat !== null || a.serviceAddress;
      if (!hasPoint) return;

      const s = spot(a.serviceLat, a.serviceLng, a.serviceAddress ?? REGIONS.find((r) => a.regions.includes(r.key))?.name);
      if (!s) {
        unplaced += 1;
        return;
      }
      const u = agentMap.get(a.userId);
      bump(s.region, "agents");
      if (wanted.has("agents")) {
        points.push({
          layer: "agents",
          id: a.userId,
          name: u?.name ?? "Agente",
          agentType: a.agentType,
          address: a.serviceAddress,
          schedule: a.schedule,
          isVerified: !!u?.isVerified,
          isMe: a.userId === agentId,
          ...s,
        });
      }
    });
  }

  return {
    bounds: BOUNDS,
    points,
    unplaced,
    regions: Array.from(rows.values()).sort((a, b) => Number(b.mine) - Number(a.mine) || b.clients - a.clients || a.name.localeCompare(b.name)),
    note:
      "Pontos sem coordenadas aparecem no centro da região. Só vê as localizações dos seus clientes. Produtores e transportadores aparecem como números por região, sem dados pessoais.",
  };
}
