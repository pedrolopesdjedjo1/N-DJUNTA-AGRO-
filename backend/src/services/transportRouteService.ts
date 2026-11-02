import { prisma } from "../lib/prisma";
import { REGIONS, nearestRegion } from "../lib/ngoRegions";
import { safe } from "../lib/agentScope";
import { distanceKm, etaMinutes, pickNumber } from "../lib/transportCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { hydrate, loadAvailableCards, loadMineCards, pointOf, validMe } from "./transportDeliveryService";

const SEVERITY_ORDER: Record<string, number> = { EMERGENCIA: 0, ALERTA: 1, ATENCAO: 2, INFO: 3 };
const ROAD_ALERTS = ["CHUVA", "TEMPESTADE", "INUNDACAO", "EMERGENCIA", "OUTRO"];

type Point = { lat: number; lng: number };

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function placeOut(p: any) {
  return { text: p.text, lat: p.lat, lng: p.lng, exact: p.exact, regionKey: p.regionKey, regionName: p.regionName };
}

function legOf(from: Point | null, to: Point | null, vehicleType: string | null) {
  if (!from || !to) return { km: null as number | null, minutes: null as number | null };
  const km = r1(distanceKm(from.lat, from.lng, to.lat, to.lng));
  return { km, minutes: km < 0.2 ? 0 : etaMinutes(km, vehicleType) };
}

// Alertas oficiais que afetam as regiões por onde se passa
async function alertsFor(regionKeys: string[]) {
  return safe(
    "alertas oficiais",
    async () => {
      const now = new Date();
      const rows = await prisma.officialAlert.findMany({
        where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, title: true, severity: true, kind: true, regions: true },
        take: 100,
      });
      return rows
        .filter((a) => ROAD_ALERTS.includes(a.kind))
        .filter((a) => a.regions.length === 0 || regionKeys.length === 0 || a.regions.some((r) => regionKeys.includes(r)))
        .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
        .slice(0, 10)
        .map((a) => ({ id: a.id, title: a.title, severity: a.severity, kind: a.kind, regions: a.regions.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k) }));
    },
    [] as any[]
  );
}

// Mercados registados pelo governo, com o que existir de localização
async function marketsNear(me: Point | null, regionKeys: string[]) {
  return safe(
    "mercados",
    async () => {
      const model = (prisma as any).govPlace;
      if (!model) return [] as any[];

      const rows: any[] = await model.findMany({ where: { kind: "MERCADO" }, take: 200 });
      const list = rows.map((r) => {
        const key = String(r.regionKey ?? r.region ?? "");
        const region = REGIONS.find((x) => x.key === key || x.name === key);
        const lat = pickNumber([r], ["lat", "latitude"]);
        const lng = pickNumber([r], ["lng", "longitude"]);
        const point = lat !== null && lng !== null ? { lat, lng } : region ? { lat: region.lat, lng: region.lng } : null;
        return {
          id: String(r.id),
          name: String(r.name ?? "Mercado"),
          address: r.address ?? null,
          regionKey: region?.key ?? null,
          regionName: region?.name ?? null,
          lat: point?.lat ?? null,
          lng: point?.lng ?? null,
          exact: lat !== null && lng !== null,
          distanceKm: me && point ? r1(distanceKm(me.lat, me.lng, point.lat, point.lng)) : null,
        };
      });

      const wanted = regionKeys.length > 0 ? list.filter((m) => !m.regionKey || regionKeys.includes(m.regionKey)) : list;
      return wanted.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999)).slice(0, 30);
    },
    [] as any[]
  );
}

// =====================================================================
// Mapa: onde estou, entregas, cargas por perto, mercados, serviços e alertas
// =====================================================================
export async function mapOverview(userId: string, role: string | undefined, filters: { lat?: number; lng?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const me = validMe(filters.lat, filters.lng);

  const [mine, available, markets, services] = await Promise.all([
    loadMineCards(userId, profile, me),
    loadAvailableCards(userId, profile, me),
    marketsNear(me, profile.regions),
    prisma.servicePoint.findMany({ where: { status: "PUBLICADO" }, take: 400 }),
  ]);

  const active = mine.filter((c) => c.phase === "ACEITE" || c.phase === "EM_TRANSPORTE");
  const regionKeys = Array.from(
    new Set<string>([
      ...profile.regions,
      ...active.flatMap((c) => [c.pickup.regionKey, c.destination.regionKey]).filter((k): k is string => !!k),
    ])
  );
  const alerts = await alertsFor(regionKeys);

  const serviceList = services
    .map((s) => {
      const region = REGIONS.find((r) => r.key === s.regionKey);
      const point = s.lat !== null && s.lng !== null ? { lat: s.lat, lng: s.lng } : region ? { lat: region.lat, lng: region.lng } : null;
      return {
        id: s.id,
        kind: s.kind,
        name: s.name,
        address: s.address,
        phone: s.phone,
        hours: s.hours,
        regionName: region?.name ?? null,
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        exact: s.lat !== null && s.lng !== null,
        distanceKm: me && point ? r1(distanceKm(me.lat, me.lng, point.lat, point.lng)) : null,
        inMyRegions: !s.regionKey || regionKeys.length === 0 || regionKeys.includes(s.regionKey),
      };
    })
    .filter((s) => s.inMyRegions)
    .sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999))
    .slice(0, 40);

  return {
    me: me ? { ...me, region: nearestRegion(me.lat, me.lng)?.name ?? null } : null,
    myRegions: profile.regions.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k),
    deliveries: active.map((c) => ({
      id: c.id,
      orderCode: c.orderCode,
      phase: c.phase,
      pickup: placeOut(c.pickup),
      destination: placeOut(c.destination),
      distanceKm: c.distanceKm,
      etaMinutes: c.etaMinutes,
      lastLocation: c.lastLocation,
      lastLat: c.lastLat,
      lastLng: c.lastLng,
      lastLocationAt: c.lastLocationAt,
      buyerName: c.buyer?.name ?? null,
      sellerName: c.seller?.name ?? null,
    })),
    loads: available
      .filter((c) => c.compatibility.ok && c.matchesMyRegions)
      .sort((a, b) => (a.fromMeKm ?? a.distanceKm ?? 99999) - (b.fromMeKm ?? b.distanceKm ?? 99999))
      .slice(0, 20)
      .map((c) => ({
        id: c.id,
        orderCode: c.orderCode,
        payout: c.payout,
        weightKg: c.weightKg,
        cargoTypes: c.cargoTypes,
        pickup: placeOut(c.pickup),
        destination: placeOut(c.destination),
        fromMeKm: c.fromMeKm,
        distanceKm: c.distanceKm,
        etaMinutes: c.etaMinutes,
      })),
    markets,
    services: serviceList,
    alerts,
    note: "As distâncias são em linha reta, por isso a estrada costuma ser mais longa. Os tempos são estimativas.",
  };
}

// =====================================================================
// Rota sugerida para todas as entregas em curso: recolhas antes das entregas, sempre a mais perto
// =====================================================================
interface Stop {
  key: string;
  deliveryId: string;
  orderCode: string;
  kind: "RECOLHA" | "ENTREGA";
  place: any;
  point: Point | null;
  weightKg: number;
  requires: string | null;
  desired: number;
}

export async function routePlan(userId: string, role: string | undefined, filters: { lat?: number; lng?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const me = validMe(filters.lat, filters.lng);
  const vehicleType = profile.vehicleType ?? null;

  const cards = (await loadMineCards(userId, profile, me)).filter((c) => c.phase === "ACEITE" || c.phase === "EM_TRANSPORTE");

  const all: Stop[] = [];
  cards.forEach((c) => {
    const desired = c.desiredDate ? new Date(c.desiredDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (c.phase === "ACEITE") {
      all.push({ key: `${c.id}:P`, deliveryId: c.id, orderCode: c.orderCode, kind: "RECOLHA", place: c.pickup, point: pointOf(c.pickup), weightKg: c.weightKg, requires: null, desired });
    }
    all.push({
      key: `${c.id}:D`,
      deliveryId: c.id,
      orderCode: c.orderCode,
      kind: "ENTREGA",
      place: c.destination,
      point: pointOf(c.destination),
      weightKg: c.weightKg,
      requires: c.phase === "ACEITE" ? `${c.id}:P` : null,
      desired,
    });
  });

  const withPoint = all.filter((s) => s.point).sort((a, b) => a.desired - b.desired);
  const withoutPoint = all.filter((s) => !s.point);
  const pointKeys = new Set(withPoint.map((s) => s.key));

  const done = new Set<string>();
  const ordered: { stop: Stop; km: number | null; minutes: number | null }[] = [];
  let current: Point | null = me;
  let remaining = withPoint.slice();

  while (remaining.length > 0) {
    const eligible = remaining.filter((s) => !s.requires || done.has(s.requires) || !pointKeys.has(s.requires));
    const pool = eligible.length > 0 ? eligible : remaining;

    let best = pool[0];
    let bestKm = Number.POSITIVE_INFINITY;
    if (current) {
      for (const s of pool) {
        const km = distanceKm(current.lat, current.lng, (s.point as Point).lat, (s.point as Point).lng);
        if (km < bestKm) {
          best = s;
          bestKm = km;
        }
      }
    }

    const leg = legOf(current, best.point, vehicleType);
    ordered.push({ stop: best, km: leg.km, minutes: leg.minutes });
    done.add(best.key);
    current = best.point;
    remaining = remaining.filter((s) => s.key !== best.key);
  }

  // A carga a bordo ao longo da rota
  let load = cards.filter((c) => c.phase === "EM_TRANSPORTE").reduce((s, c) => s + c.weightKg, 0);
  let maxLoad = load;
  let overAt: number | null = null;
  const capacity: number | null = profile.capacityKg ?? null;

  let cumulative = 0;
  const stops = ordered.map((o, index) => {
    load += o.stop.kind === "RECOLHA" ? o.stop.weightKg : -o.stop.weightKg;
    maxLoad = Math.max(maxLoad, load);
    if (capacity && load > capacity && overAt === null) overAt = index + 1;
    cumulative += o.minutes ?? 0;

    return {
      order: index + 1,
      deliveryId: o.stop.deliveryId,
      orderCode: o.stop.orderCode,
      kind: o.stop.kind,
      place: placeOut(o.stop.place),
      legKm: o.km,
      legMinutes: o.minutes,
      cumulativeMinutes: cumulative,
      loadAfterKg: r1(Math.max(0, load)),
    };
  });

  const regionKeys = Array.from(new Set(all.map((s) => s.place.regionKey).filter((k: any): k is string => !!k)));
  const alerts = await alertsFor(regionKeys);

  return {
    from: me ? "ME" : "FIRST_STOP",
    stops,
    withoutPoint: withoutPoint.map((s) => ({ deliveryId: s.deliveryId, orderCode: s.orderCode, kind: s.kind, place: placeOut(s.place) })),
    totalKm: r1(stops.reduce((s, x) => s + (x.legKm ?? 0), 0)),
    totalMinutes: cumulative,
    maxLoadKg: r1(Math.max(0, maxLoad)),
    capacityKg: capacity,
    overCapacityAtStop: overAt,
    alerts,
    note: me
      ? "Rota sugerida a partir de onde está: recolhas antes das entregas, sempre a paragem mais perto. Distâncias em linha reta."
      : "Sem a sua localização, a rota começa na primeira paragem. Ative a localização para uma rota a partir de onde está.",
  };
}

// Percurso de uma só entrega: de onde está até à recolha e ao destino
export async function routeForDelivery(userId: string, role: string | undefined, id: string, filters: { lat?: number; lng?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const me = validMe(filters.lat, filters.lng);
  const vehicleType = profile.vehicleType ?? null;

  const d: any = await prisma.delivery.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Entrega não encontrada.");
  }
  const [card] = await hydrate([d], { userId, profile, me });
  if (!card || (!card.mine && card.phase !== "DISPONIVEL")) {
    throw new Error("Entrega não encontrada.");
  }

  const pickup = pointOf(card.pickup);
  const destination = pointOf(card.destination);
  const toPickup = card.phase === "EM_TRANSPORTE" ? null : legOf(me, pickup, vehicleType);
  const trip = legOf(card.phase === "EM_TRANSPORTE" ? me ?? pickup : pickup, destination, vehicleType);

  const regionKeys = [card.pickup.regionKey, card.destination.regionKey].filter((k): k is string => !!k);
  const alerts = await alertsFor(regionKeys);

  return {
    id,
    orderCode: card.orderCode,
    phase: card.phase,
    pickup: placeOut(card.pickup),
    destination: placeOut(card.destination),
    legs: [
      ...(toPickup && toPickup.km !== null ? [{ label: "Até à recolha", km: toPickup.km, minutes: toPickup.minutes }] : []),
      { label: card.phase === "EM_TRANSPORTE" ? "Até ao destino" : "Da recolha ao destino", km: trip.km, minutes: trip.minutes },
    ],
    totalKm: r1((toPickup?.km ?? 0) + (trip.km ?? 0)),
    totalMinutes: (toPickup?.minutes ?? 0) + (trip.minutes ?? 0),
    alerts,
    note: "Distâncias em linha reta e tempos estimados pela velocidade média do veículo. A estrada real pode ser mais longa.",
  };
}
