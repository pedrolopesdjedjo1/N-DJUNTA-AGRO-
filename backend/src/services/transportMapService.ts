import { prisma } from "../lib/prisma";
import { REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { safe } from "../lib/agentScope";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadAvailableCards, loadMineCards } from "./transportDeliveryService";

const BOUNDS = { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 };
const SEVERITY_RANK: Record<string, number> = { INFO: 0, ATENCAO: 1, ALERTA: 2, EMERGENCIA: 3 };
const ROAD_ALERTS = ["CHUVA", "TEMPESTADE", "INUNDACAO", "EMERGENCIA", "OUTRO"];
const MAX_DELIVERIES = 60;

interface Place {
  text: string | null;
  lat: number | null;
  lng: number | null;
  regionKey: string | null;
  regionName: string | null;
  exact: boolean;
}

function placePoint(p: Place) {
  if (p.exact && p.lat !== null && p.lng !== null) {
    return { lat: p.lat, lng: p.lng, approximate: false, region: p.regionName };
  }
  const region = REGIONS.find((r) => r.key === p.regionKey);
  return region ? { lat: region.lat, lng: region.lng, approximate: true, region: region.name } : null;
}

function rawSpot(lat: number | null | undefined, lng: number | null | undefined, text: string | null | undefined) {
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    return { lat, lng, approximate: false, region: nearestRegion(lat, lng)?.name ?? text ?? null };
  }
  const region = findRegion(text);
  return region ? { lat: region.lat, lng: region.lng, approximate: true, region: region.name } : null;
}

// Mapa do transportador: entregas, a minha posição, mercados, portos, armazéns, estradas e alertas
export async function getTransporterMap(userId: string, role: string | undefined, filters: { layers?: string; scope?: string }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const wanted = new Set(
    (filters.layers ?? "available,mine,markets,infra")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const [availableAll, mineAll, places, alerts] = await Promise.all([
    loadAvailableCards(userId, profile),
    loadMineCards(userId, profile),
    prisma.govPlace.findMany({
      where: { isPublic: true, kind: { in: ["MERCADO", "INFRAESTRUTURA"] } },
      select: { id: true, name: true, kind: true, subtype: true, region: true, lat: true, lng: true, status: true, schedule: true },
      take: 800,
    }),
    safe(
      "alertas oficiais",
      async () => {
        const now = new Date();
        return prisma.officialAlert.findMany({
          where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          select: { id: true, title: true, severity: true, kind: true, regions: true },
          take: 100,
        });
      },
      [] as any[]
    ),
  ]);

  const available =
    filters.scope === "all" || profile.regions.length === 0 ? availableAll : availableAll.filter((c) => c.matchesMyRegions);
  const mine = mineAll.filter((c) => c.phase === "ACEITE" || c.phase === "EM_TRANSPORTE");

  const rows = new Map<string, any>();
  REGIONS.forEach((r) =>
    rows.set(r.key, {
      key: r.key,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      mine: profile.regions.includes(r.key),
      available: 0,
      active: 0,
      markets: 0,
      infrastructures: 0,
      damaged: 0,
      alerts: { active: 0, maxSeverity: null as string | null },
    })
  );
  const bump = (key: string | null | undefined, field: string) => {
    const row = key ? rows.get(key) : null;
    if (row) row[field] += 1;
  };

  available.forEach((c) => {
    bump(c.pickup.regionKey, "available");
    if (c.destination.regionKey !== c.pickup.regionKey) bump(c.destination.regionKey, "available");
  });
  mine.forEach((c) => {
    bump(c.pickup.regionKey, "active");
    if (c.destination.regionKey !== c.pickup.regionKey) bump(c.destination.regionKey, "active");
  });

  (alerts as any[])
    .filter((a) => ROAD_ALERTS.includes(a.kind))
    .forEach((a) => {
      const keys: string[] = a.regions.length === 0 ? REGIONS.map((r) => r.key) : a.regions;
      keys.forEach((key) => {
        const row = rows.get(key);
        if (!row) return;
        row.alerts.active += 1;
        if (!row.alerts.maxSeverity || (SEVERITY_RANK[a.severity] ?? 0) > (SEVERITY_RANK[row.alerts.maxSeverity] ?? 0)) {
          row.alerts.maxSeverity = a.severity;
        }
      });
    });

  places.forEach((p) => {
    const key = findRegion(p.region)?.key ?? (p.lat !== null && p.lng !== null ? nearestRegion(p.lat, p.lng)?.key : null);
    if (p.kind === "MERCADO") bump(key, "markets");
    else {
      bump(key, "infrastructures");
      if (p.status === "DANIFICADA") bump(key, "damaged");
    }
  });

  const points: any[] = [];
  const deliveries: any[] = [];
  let unplaced = 0;

  if (wanted.has("available")) {
    available.slice(0, MAX_DELIVERIES).forEach((c) => {
      const a = placePoint(c.pickup);
      const b = placePoint(c.destination);
      if (!a && !b) {
        unplaced += 1;
        return;
      }
      deliveries.push({ id: c.id, orderCode: c.orderCode, payout: c.payout, distanceKm: c.distanceKm, overCapacity: c.overCapacity, pickup: a, destination: b });
      if (a) points.push({ layer: "available", id: c.id, role: "recolha", orderCode: c.orderCode, payout: c.payout, text: c.pickup.text, ...a });
      if (b) points.push({ layer: "available", id: c.id, role: "destino", orderCode: c.orderCode, payout: c.payout, text: c.destination.text, ...b });
    });
  }

  if (wanted.has("mine")) {
    mine.forEach((c) => {
      const a = placePoint(c.pickup);
      const b = placePoint(c.destination);
      if (a) points.push({ layer: "mine", id: c.id, role: "recolha", phase: c.phase, orderCode: c.orderCode, text: c.pickup.text, ...a });
      if (b) points.push({ layer: "mine", id: c.id, role: "destino", phase: c.phase, orderCode: c.orderCode, text: c.destination.text, ...b });
      if (c.phase === "EM_TRANSPORTE" && c.lastLat !== null && c.lastLng !== null) {
        points.push({
          layer: "position",
          id: c.id,
          orderCode: c.orderCode,
          text: c.lastLocation,
          at: c.lastLocationAt,
          lat: c.lastLat,
          lng: c.lastLng,
          approximate: false,
          region: nearestRegion(c.lastLat, c.lastLng)?.name ?? null,
        });
      }
    });
  }

  places.forEach((p) => {
    const layer = p.kind === "MERCADO" ? "markets" : "infra";
    if (!wanted.has(layer)) return;
    const s = rawSpot(p.lat, p.lng, p.region);
    if (!s) {
      unplaced += 1;
      return;
    }
    points.push({ layer, id: p.id, name: p.name, kind: p.kind, subtype: p.subtype, status: p.status, schedule: p.schedule, ...s });
  });

  return {
    bounds: BOUNDS,
    points,
    deliveries,
    unplaced,
    regions: Array.from(rows.values()).sort((a, b) => Number(b.mine) - Number(a.mine) || b.available - a.available || a.name.localeCompare(b.name)),
    note:
      "Pontos sem coordenadas aparecem no centro da região. As entregas disponíveis mostram só a localidade, nunca a morada exata do comprador. Estradas danificadas e alertas oficiais ajudam a planear o caminho.",
  };
}
