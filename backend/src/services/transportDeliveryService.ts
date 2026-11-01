import { prisma } from "../lib/prisma";
import { REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { stageOf } from "../lib/agentOpsCatalog";
import { clean, plain, safe } from "../lib/agentScope";
import { isStorageUrl } from "../lib/adminUserCatalog";
import { getSetting } from "../lib/platformSettings";
import { values } from "../lib/ngoCatalog";
import {
  COMPAT_MESSAGES,
  DELIVERY_WRITE,
  ORDER_WRITE,
  PROBLEM_KINDS,
  RELEASE_REASONS,
  KG_FACTOR,
  PICKUP_TEXT,
  PICKUP_LAT,
  PICKUP_LNG,
  DEST_TEXT,
  DEST_LAT,
  DEST_LNG,
  cargoTypeOf,
  deliveryPhase,
  distanceKm,
  etaMinutes,
  pickNumber,
  pickText,
} from "../lib/transportCatalog";
import { loadAdmin } from "./adminAccess";
import { assertTransporter, ensureProfile } from "./transporterService";

const PAGE_SIZE = 20;
const MAX_ACTIVE = 8;
const LOCATION_MIN_MS = 15000;
const PROBLEM_VALUES = values(PROBLEM_KINDS);
const RELEASE_VALUES = values(RELEASE_REASONS);

interface Place {
  text: string | null;
  lat: number | null;
  lng: number | null;
  regionKey: string | null;
  regionName: string | null;
  exact: boolean;
}

interface Me {
  lat: number;
  lng: number;
}

interface Ctx {
  userId: string;
  profile: any;
  me?: Me | null;
}

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

function firstName(name?: string | null): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "Cliente";
}

function unique<T>(list: (T | null | undefined)[]): T[] {
  return Array.from(new Set(list.filter((x): x is T => x !== null && x !== undefined && (x as any) !== "")));
}

export function validMe(lat: any, lng: any): Me | null {
  if (lat === undefined || lat === null || lat === "" || lng === undefined || lng === null || lng === "") return null;
  const a = Number(lat);
  const b = Number(lng);
  if (isNaN(a) || isNaN(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

function buildPlace(text: string | null, lat: number | null, lng: number | null, fallback: string | null): Place {
  const exact = lat !== null && lng !== null;
  const label = text ?? fallback ?? null;
  const region = exact ? nearestRegion(lat as number, lng as number) : findRegion(label);

  return {
    text: label,
    lat: exact ? lat : null,
    lng: exact ? lng : null,
    regionKey: region?.key ?? null,
    regionName: region?.name ?? null,
    exact,
  };
}

export function pointOf(p: Place): { lat: number; lng: number } | null {
  if (p.exact) return { lat: p.lat as number, lng: p.lng as number };
  const region = REGIONS.find((r) => r.key === p.regionKey);
  return region ? { lat: region.lat, lng: region.lng } : null;
}

function distanceOf(a: Place, b: Place): { km: number | null; approx: boolean } {
  const pa = pointOf(a);
  const pb = pointOf(b);
  if (!pa || !pb) return { km: null, approx: false };
  return { km: Math.round(distanceKm(pa.lat, pa.lng, pb.lat, pb.lng) * 10) / 10, approx: !(a.exact && b.exact) };
}

// O veículo serve a esta carga?
function compatOf(profile: any, weightKg: number, cargo: string[]) {
  if (!profile) return { ok: true, reasons: [] as string[] };

  const reasons: string[] = [];
  if (!profile.vehicleType) {
    reasons.push("SEM_VEICULO");
  } else {
    if (profile.vehicleStatus && profile.vehicleStatus !== "OPERACIONAL") reasons.push("VEICULO_INDISPONIVEL");
    if (!profile.capacityKg) reasons.push("SEM_CAPACIDADE");
    else if (weightKg > profile.capacityKg) reasons.push("CAPACIDADE");
    if ((profile.cargoTypes ?? []).length > 0 && cargo.some((c) => !profile.cargoTypes.includes(c))) reasons.push("TIPO_DE_CARGA");
  }
  return { ok: reasons.length === 0, reasons };
}

async function notifyUsers(ids: (string | null | undefined)[], title: string, message: string, relatedId: string) {
  const list = unique(ids);
  if (list.length === 0) return;

  await prisma.notification.createMany({
    data: list.map((userId) => ({ userId, type: "SISTEMA" as const, title, message: message.slice(0, 300), relatedId })),
  });
}

async function addEvent(
  deliveryId: string,
  actorId: string,
  kind: string,
  extra: { category?: string | null; message?: string | null; lat?: number | null; lng?: number | null; photoUrl?: string | null } = {}
) {
  await prisma.deliveryEvent.create({
    data: {
      deliveryId,
      actorId,
      kind,
      category: extra.category ?? null,
      message: extra.message ?? null,
      lat: extra.lat ?? null,
      lng: extra.lng ?? null,
      photoUrl: extra.photoUrl ?? null,
    },
  });
}

async function transportAdmins(): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const snaps = await Promise.all(admins.map((a) => loadAdmin(a.id)));
  return snaps.filter((s) => s && s.status === "ATIVO" && s.permissions.has("transport.manage")).map((s) => (s as any).userId as string);
}

function photoOf(value: any, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (!isStorageUrl(value)) {
    throw new Error(`${label} inválida. Envie a foto pelo app.`);
  }
  return String(value);
}

function readPoint(input: any): { lat: number; lng: number } | null {
  const me = validMe(input?.lat, input?.lng);
  return me ? { lat: me.lat, lng: me.lng } : null;
}

// =====================================================================
// Monta os cartões das entregas (encomenda, produtos, locais, valor, compatibilidade)
// =====================================================================
export async function hydrate(rows: any[], ctx: Ctx) {
  if (rows.length === 0) return [] as any[];

  const orderIds = unique<string>(rows.map((d) => d.orderId));
  const orders: any[] = orderIds.length
    ? await safe("encomendas", async () => (await prisma.order.findMany({ where: { id: { in: orderIds } } })) as any[], [] as any[])
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const items: any[] = orderIds.length
    ? await safe("itens", async () => (await prisma.orderItem.findMany({ where: { orderId: { in: orderIds } } })) as any[], [] as any[])
    : [];
  const productIds = unique<string>(items.map((i) => i.productId));
  const products: any[] = productIds.length
    ? await safe(
        "produtos",
        async () =>
          (await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, unit: true, department: true, subcategory: true, title: true } })) as any[],
        [] as any[]
      )
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const userIds = unique<string>([...orders.flatMap((o) => [o.buyerId, o.sellerId]), ...rows.map((d) => d.transporterId)]);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, role: true, location: true, photoUrl: true, isVerified: true, phone: true },
      })
    : [];
  const people = new Map(users.map((u) => [u.id, u]));

  const deliveredIds = rows.filter((d) => deliveryPhase(d, orderMap.get(d.orderId)) === "ENTREGUE").map((d) => d.id);
  const deliveredEvents: any[] = deliveredIds.length
    ? await safe("datas das entregas", async () => (await prisma.deliveryEvent.findMany({ where: { deliveryId: { in: deliveredIds }, kind: "ENTREGUE" } })) as any[], [] as any[])
    : [];
  const deliveredAt = new Map(deliveredEvents.map((e) => [e.deliveryId, e.createdAt]));

  const profile = ctx.profile;
  const vehicleType = profile?.vehicleType ?? null;
  const me = ctx.me ?? null;

  return rows.map((d) => {
    const order = orderMap.get(d.orderId) ?? null;
    const phase = deliveryPhase(d, order);
    const mine = !!d.transporterId && d.transporterId === ctx.userId;
    const seller = order ? people.get(order.sellerId) : undefined;
    const buyer = order ? people.get(order.buyerId) : undefined;

    const pickup = buildPlace(pickText([d, order], PICKUP_TEXT), pickNumber([d, order], PICKUP_LAT), pickNumber([d, order], PICKUP_LNG), seller?.location ?? null);
    const destination = buildPlace(pickText([d, order], DEST_TEXT), pickNumber([d, order], DEST_LAT), pickNumber([d, order], DEST_LNG), buyer?.location ?? null);
    const dist = distanceOf(pickup, destination);

    const its = items
      .filter((i) => i.orderId === d.orderId)
      .map((i) => {
        const product = productMap.get(i.productId);
        const unit = product?.unit ? String(product.unit).trim().toLowerCase() : i.unit ? String(i.unit).toLowerCase() : null;
        return {
          id: i.id,
          title: String(i.title ?? "Produto"),
          quantity: Number(i.quantity) || 0,
          unit,
          cargo: cargoTypeOf(product?.department ?? null, `${i.title ?? ""} ${product?.subcategory ?? ""}`),
        };
      });

    let weightKg = 0;
    let unknownUnits = 0;
    its.forEach((i) => {
      const factor = i.unit ? KG_FACTOR[String(i.unit).toLowerCase()] : undefined;
      if (factor) weightKg += i.quantity * factor;
      else unknownUnits += 1;
    });
    weightKg = Math.round(weightKg * 10) / 10;

    const cargoTypes = unique<string>(its.map((i) => i.cargo));
    const capacity = profile?.capacityKg ?? null;
    const regions: string[] = profile?.regions ?? [];
    const payoutRaw = order?.shippingCost;
    const payout = payoutRaw !== null && payoutRaw !== undefined && !isNaN(Number(payoutRaw)) ? Number(payoutRaw) : null;
    const stage = order ? stageOf(order.status) : "NOVA";

    const pickupPoint = pointOf(pickup);
    const fromMeKm = me && pickupPoint ? Math.round(distanceKm(me.lat, me.lng, pickupPoint.lat, pickupPoint.lng) * 10) / 10 : null;

    const side = (p: any, full: boolean) =>
      p
        ? {
            name: full ? p.name : firstName(p.name),
            location: p.location ?? null,
            isVerified: !!p.isVerified,
            ...(mine ? { id: p.id, phone: p.phone ?? null, photoUrl: p.photoUrl ?? null } : {}),
          }
        : null;

    return {
      id: d.id,
      orderId: d.orderId,
      orderCode: shortId(d.orderId),
      phase,
      status: d.status ? String(d.status) : null,
      mine,
      createdAt: d.createdAt ?? null,
      desiredDate: order?.desiredDate ?? null,
      orderStage: stage,
      ready: stage === "PRONTO",
      payout,
      orderTotal: order ? Number(order.total) || 0 : null,
      paymentMethod: order?.paymentMethod ?? null,
      pickup,
      destination,
      distanceKm: dist.km,
      distanceApprox: dist.approx,
      etaMinutes: etaMinutes(dist.km, vehicleType),
      fromMeKm,
      fromMeApprox: !pickup.exact,
      items: its,
      itemsCount: its.length,
      cargoTypes,
      weightKg,
      weightPartial: unknownUnits > 0,
      overCapacity: !!capacity && weightKg > capacity,
      compatibility: compatOf(profile, weightKg, cargoTypes),
      matchesMyRegions: regions.length === 0 || [pickup.regionKey, destination.regionKey].some((k) => !!k && regions.includes(k as string)),
      seller: side(seller, true),
      buyer: side(buyer, mine),
      lastLocation: d.lastLocation ?? null,
      lastLat: d.lastLat ?? null,
      lastLng: d.lastLng ?? null,
      lastLocationAt: d.lastLocationAt ?? null,
      deliveredAt: deliveredAt.get(d.id) ?? (phase === "ENTREGUE" ? order?.updatedAt ?? null : null),
    };
  });
}

export async function loadMineCards(userId: string, profile: any, me?: Me | null) {
  const rows: any[] = await prisma.delivery.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" }, take: 500 });
  return hydrate(rows, { userId, profile, me });
}

// Entregas por aceitar (sem transportador) e que o próprio ainda não recusou
export async function loadAvailableCards(userId: string, profile: any, me?: Me | null) {
  const [rows, dismissed]: [any[], { deliveryId: string }[]] = await Promise.all([
    prisma.delivery.findMany({ where: { transporterId: null }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.deliveryDismissal.findMany({ where: { transporterId: userId }, select: { deliveryId: true } }),
  ]);

  const hidden = new Set(dismissed.map((x) => x.deliveryId));
  const open = rows.filter((d) => !hidden.has(d.id) && deliveryPhase(d) === "DISPONIVEL");
  const cards = await hydrate(open, { userId, profile, me });
  return cards.filter((c) => c.phase === "DISPONIVEL" && !!c.orderId);
}

// =====================================================================
// Cargas e entregas disponíveis
// =====================================================================
export async function listAvailable(
  userId: string,
  role: string | undefined,
  filters: {
    scope?: string;
    region?: string;
    fit?: string;
    cargo?: string;
    compatible?: string;
    q?: string;
    sort?: string;
    page?: number;
    lat?: number;
    lng?: number;
  }
) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const me = validMe(filters.lat, filters.lng);

  const all = await loadAvailableCards(userId, profile, me);
  const matching = all.filter((c) => c.matchesMyRegions);

  let list = filters.scope === "all" || profile.regions.length === 0 ? all : matching;
  if (filters.region) list = list.filter((c) => c.pickup.regionKey === filters.region || c.destination.regionKey === filters.region);

  const byCargo: Record<string, number> = {};
  list.forEach((c) => c.cargoTypes.forEach((t: string) => (byCargo[t] = (byCargo[t] ?? 0) + 1)));

  if (filters.cargo) list = list.filter((c) => c.cargoTypes.includes(filters.cargo as string));
  if (filters.fit === "yes") list = list.filter((c) => !c.overCapacity);
  if (filters.compatible === "yes") list = list.filter((c) => c.compatibility.ok);

  const needle = plain(filters.q);
  if (needle) {
    list = list.filter((c) =>
      plain(`${c.items.map((i: any) => i.title).join(" ")} ${c.pickup.text} ${c.destination.text} ${c.orderCode}`).includes(needle)
    );
  }

  if (filters.sort === "VALOR") list = [...list].sort((a, b) => (b.payout ?? -1) - (a.payout ?? -1));
  else if (filters.sort === "PERTO") {
    const far = Number.MAX_SAFE_INTEGER;
    list = me
      ? [...list].sort((a, b) => (a.fromMeKm ?? far) - (b.fromMeKm ?? far))
      : [...list].sort((a, b) => (a.distanceKm ?? far) - (b.distanceKm ?? far));
  }

  const total = list.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    summary: {
      all: all.length,
      matching: matching.length,
      compatible: matching.filter((c) => c.compatibility.ok).length,
      overCapacity: all.filter((c) => c.overCapacity).length,
      totalPayout: Math.round(matching.reduce((s, c) => s + (c.payout ?? 0), 0)),
      isAvailable: profile.isAvailable,
      hasRegions: profile.regions.length > 0,
      vehicleReady: !!profile.vehicleType && !!profile.capacityKg && profile.vehicleStatus === "OPERACIONAL",
      byCargo,
      withPosition: !!me,
    },
    total,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

// =====================================================================
// As minhas entregas
// =====================================================================
export async function listMine(userId: string, role: string | undefined, filters: { phase?: string; q?: string; page?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const cards = await loadMineCards(userId, profile);

  const counts = {
    upcoming: cards.filter((c) => c.phase === "ACEITE").length,
    inProgress: cards.filter((c) => c.phase === "EM_TRANSPORTE").length,
    completed: cards.filter((c) => c.phase === "ENTREGUE").length,
    cancelled: cards.filter((c) => c.phase === "CANCELADA").length,
    total: cards.length,
  };

  const wanted = filters.phase ?? "active";
  let list = cards;
  if (wanted === "active") list = cards.filter((c) => c.phase === "ACEITE" || c.phase === "EM_TRANSPORTE");
  else if (wanted === "upcoming") list = cards.filter((c) => c.phase === "ACEITE");
  else if (wanted === "inProgress") list = cards.filter((c) => c.phase === "EM_TRANSPORTE");
  else if (wanted === "completed") list = cards.filter((c) => c.phase === "ENTREGUE");
  else if (wanted === "cancelled") list = cards.filter((c) => c.phase === "CANCELADA");

  const needle = plain(filters.q);
  if (needle) {
    list = list.filter((c) =>
      plain(`${c.items.map((i: any) => i.title).join(" ")} ${c.pickup.text} ${c.destination.text} ${c.orderCode} ${c.buyer?.name} ${c.seller?.name}`).includes(needle)
    );
  }

  if (wanted === "completed") {
    list = [...list].sort((a, b) => new Date(b.deliveredAt ?? 0).getTime() - new Date(a.deliveredAt ?? 0).getTime());
  } else if (wanted === "upcoming" || wanted === "active") {
    const rank = (c: any) => (c.phase === "EM_TRANSPORTE" ? 0 : 1);
    list = [...list].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.desiredDate ? new Date(a.desiredDate).getTime() : Number.MAX_SAFE_INTEGER) -
          (b.desiredDate ? new Date(b.desiredDate).getTime() : Number.MAX_SAFE_INTEGER)
    );
  }

  const total = list.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return { counts, total, page, pageSize: PAGE_SIZE, items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

// =====================================================================
// Detalhe de uma entrega
// =====================================================================
export async function getDelivery(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const d: any = await prisma.delivery.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Entrega não encontrada.");
  }

  const [card] = await hydrate([d], { userId, profile });
  if (!card || (!card.mine && card.phase !== "DISPONIVEL")) {
    throw new Error("Entrega não encontrada.");
  }

  const events: any[] = await prisma.deliveryEvent.findMany({ where: { deliveryId: id }, orderBy: { createdAt: "asc" }, take: 100 });
  const actorIds = unique<string>(events.map((e) => e.actorId));
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(actors.map((a) => [a.id, a.name]));

  const mine = card.mine;
  const active = card.phase === "ACEITE" || card.phase === "EM_TRANSPORTE";
  const started = events.some((e) => e.kind === "INICIOU");
  const arrived = events.some((e) => e.kind === "CHEGOU");
  const dismissed =
    !mine && (await prisma.deliveryDismissal.findUnique({ where: { transporterId_deliveryId: { transporterId: userId, deliveryId: id } } }));

  return {
    delivery: card,
    tracking: { started, arrived },
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      category: e.category,
      message: e.message,
      photoUrl: e.photoUrl ?? null,
      createdAt: e.createdAt,
      authorName: e.actorId === userId ? "Você" : names.get(e.actorId) ?? "Utilizador",
    })),
    actions: {
      canAccept: card.phase === "DISPONIVEL" && profile.isAvailable && card.compatibility.ok && !dismissed,
      canDecline: card.phase === "DISPONIVEL" && !dismissed,
      canRelease: mine && active,
      canCollect: mine && card.phase === "ACEITE",
      canStart: mine && card.phase === "EM_TRANSPORTE" && !started,
      canArrive: mine && card.phase === "EM_TRANSPORTE" && !arrived,
      canDeliver: mine && card.phase === "EM_TRANSPORTE",
      canShareLocation: mine && active,
      canReportProblem: mine && active,
    },
    compatibilityMessages: card.compatibility.reasons.map((r: string) => COMPAT_MESSAGES[r] ?? r),
    notAvailableReason:
      card.phase === "DISPONIVEL" && !profile.isAvailable ? "Está marcado como indisponível. Ligue a disponibilidade para aceitar entregas." : null,
  };
}

// =====================================================================
// Ações sobre uma entrega
// =====================================================================
async function loadFor(id: string) {
  const d: any = await prisma.delivery.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Entrega não encontrada.");
  }

  const order: any = d.orderId ? await prisma.order.findUnique({ where: { id: d.orderId } }) : null;
  if (!order) {
    throw new Error("A encomenda desta entrega não foi encontrada.");
  }
  return { d, order, phase: deliveryPhase(d, order) };
}

async function transporterName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "O transportador";
}

export async function acceptDelivery(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  if (!profile.isAvailable) {
    throw new Error("Está marcado como indisponível. Ligue a disponibilidade para aceitar entregas.");
  }

  const mineRows: any[] = await prisma.delivery.findMany({ where: { transporterId: userId }, take: 300 });
  const active = mineRows.filter((d) => ["ACEITE", "EM_TRANSPORTE"].includes(deliveryPhase(d))).length;
  if (active >= MAX_ACTIVE) {
    throw new Error(`Já tem ${MAX_ACTIVE} entregas por concluir. Conclua algumas antes de aceitar outras.`);
  }

  const { d, order, phase } = await loadFor(id);
  if (phase !== "DISPONIVEL") {
    throw new Error("Esta entrega já não está disponível.");
  }

  // Só aceita o que o seu veículo e a sua capacidade permitem
  const [card] = await hydrate([d], { userId, profile });
  if (card && !card.compatibility.ok) {
    throw new Error(COMPAT_MESSAGES[card.compatibility.reasons[0]] ?? "Esta entrega não é compatível com o seu veículo.");
  }

  // Só um transportador a consegue: a primeira que chegar
  const claimed = await prisma.delivery.updateMany({
    where: { id, transporterId: null },
    data: { transporterId: userId, status: DELIVERY_WRITE.ACCEPTED },
  });
  if (claimed.count === 0) {
    throw new Error("Esta entrega já foi aceite por outro transportador.");
  }

  await addEvent(id, userId, "ACEITE");
  const name = await transporterName(userId);
  await notifyUsers(
    [order.buyerId, order.sellerId],
    "Um transportador aceitou a entrega",
    `${name} vai transportar a encomenda ${shortId(order.id)}.`,
    id
  );

  return getDelivery(userId, role, id);
}

// Recusar uma entrega disponível: deixa de aparecer ao transportador
export async function declineDelivery(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);

  const { phase } = await loadFor(id);
  if (phase !== "DISPONIVEL") {
    throw new Error("Só pode recusar entregas que ainda estão disponíveis.");
  }

  await prisma.deliveryDismissal.upsert({
    where: { transporterId_deliveryId: { transporterId: userId, deliveryId: id } },
    create: { transporterId: userId, deliveryId: id },
    update: {},
  });

  return { id, declined: true };
}

// Cancelar uma entrega aceite, com motivo. Depois de recolher os produtos exige mais explicação
// e a equipa é avisada para acompanhar o caso.
export async function releaseDelivery(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE" && phase !== "EM_TRANSPORTE") {
    throw new Error("Esta entrega já não pode ser cancelada.");
  }
  const afterCollection = phase === "EM_TRANSPORTE";

  const reason = String(input?.reason ?? "");
  if (!RELEASE_VALUES.includes(reason)) {
    throw new Error("Escolha o motivo do cancelamento.");
  }
  const note = clean(input?.message, 300);
  if (afterCollection && (!note || note.length < 10)) {
    throw new Error("Depois de recolher os produtos, explique o que se passou e onde estão (pelo menos 10 letras).");
  }
  const label = RELEASE_REASONS.find((r) => r.value === reason)?.label ?? reason;

  const released = await prisma.delivery.updateMany({
    where: { id, transporterId: userId },
    data: { transporterId: null, status: DELIVERY_WRITE.PENDING },
  });
  if (released.count === 0) {
    throw new Error("Não foi possível cancelar a entrega.");
  }

  await prisma.deliveryDismissal.upsert({
    where: { transporterId_deliveryId: { transporterId: userId, deliveryId: id } },
    create: { transporterId: userId, deliveryId: id },
    update: {},
  });
  await addEvent(id, userId, "DESISTIU", {
    category: reason,
    message: `${label}${afterCollection ? " (depois da recolha)" : ""}${note ? `. ${note}` : ""}`,
  });

  await notifyUsers(
    [order.buyerId, order.sellerId],
    afterCollection ? "A entrega foi cancelada a meio" : "A entrega voltou a ficar disponível",
    `O transportador cancelou a encomenda ${shortId(order.id)}. Estamos a procurar outro.`,
    id
  );
  if (afterCollection) {
    const name = await transporterName(userId);
    await notifyUsers(await transportAdmins(), "Entrega cancelada depois da recolha", `${name} cancelou a entrega ${shortId(order.id)} com os produtos recolhidos: ${label}. ${note ?? ""}`, id);
  }

  return { id, released: true, afterCollection };
}

// Confirmar a recolha dos produtos (com foto, se quiser)
export async function collectDelivery(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE") {
    throw new Error(phase === "EM_TRANSPORTE" ? "Já confirmou a recolha." : "Esta entrega não está por recolher.");
  }

  const photoUrl = photoOf(input?.photoUrl, "Foto da recolha");
  await prisma.delivery.update({ where: { id }, data: { status: DELIVERY_WRITE.IN_TRANSIT } });
  await addEvent(id, userId, "RECOLHIDA", { message: clean(input?.message, 300), photoUrl });

  const name = await transporterName(userId);
  await notifyUsers([order.buyerId], "Os seus produtos foram recolhidos", `${name} recolheu a encomenda ${shortId(order.id)}. A viagem vai começar.`, id);

  return getDelivery(userId, role, id);
}

// Iniciar o transporte: a partir daqui a entrega fica acompanhada
export async function startTrip(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "EM_TRANSPORTE") {
    throw new Error(phase === "ACEITE" ? "Confirme primeiro a recolha dos produtos." : "Esta entrega não está em transporte.");
  }
  if (await prisma.deliveryEvent.findFirst({ where: { deliveryId: id, kind: "INICIOU" } })) {
    return getDelivery(userId, role, id);
  }

  const point = readPoint(input);
  await addEvent(id, userId, "INICIOU", { lat: point?.lat ?? null, lng: point?.lng ?? null });
  if (point && profile.shareLocation) {
    const region = nearestRegion(point.lat, point.lng);
    await prisma.delivery.update({
      where: { id },
      data: { lastLocation: region ? `Perto de ${region.name}` : "Viagem iniciada", lastLat: point.lat, lastLng: point.lng, lastLocationAt: new Date() },
    });
  }

  const [card] = await hydrate([d], { userId, profile });
  await notifyUsers(
    [order.buyerId],
    "A viagem começou",
    `A encomenda ${shortId(order.id)} está a caminho${card?.etaMinutes ? `. Chegada estimada em cerca de ${card.etaMinutes} minutos` : ""}.`,
    id
  );

  return getDelivery(userId, role, id);
}

// Avisar que chegou ao destino
export async function arriveAtDestination(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "EM_TRANSPORTE") {
    throw new Error("Esta entrega não está em transporte.");
  }
  if (await prisma.deliveryEvent.findFirst({ where: { deliveryId: id, kind: "CHEGOU" } })) {
    return getDelivery(userId, role, id);
  }

  const point = readPoint(input);
  await addEvent(id, userId, "CHEGOU", { lat: point?.lat ?? null, lng: point?.lng ?? null });
  await notifyUsers([order.buyerId], "O transportador chegou", `A encomenda ${shortId(order.id)} chegou ao destino. Prepare-se para a receber.`, id);

  return getDelivery(userId, role, id);
}

// Confirmar a entrega, com comprovativo
export async function deliverDelivery(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase === "ACEITE") {
    throw new Error("Confirme primeiro a recolha dos produtos.");
  }
  if (phase !== "EM_TRANSPORTE") {
    throw new Error("Esta entrega não está em transporte.");
  }

  // Toda a entrega tem de ter recolha, acompanhamento e confirmação
  const started = await prisma.deliveryEvent.findFirst({ where: { deliveryId: id, kind: "INICIOU" } });
  if (!started && !d.lastLocationAt) {
    throw new Error("Registe o início da viagem antes de entregar, para a entrega ficar acompanhada.");
  }

  const proofUrl = photoOf(input?.proofUrl, "Foto do comprovativo");
  const noProof = clean(input?.noProofReason, 200);
  if (!proofUrl && (!noProof || noProof.length < 5)) {
    throw new Error("Envie a foto do comprovativo de entrega. Se não for possível, explique porquê.");
  }

  const receivedBy = clean(input?.receivedBy, 80);
  const note = clean(input?.message, 300);
  const point = readPoint(input);

  await prisma.delivery.update({ where: { id }, data: { status: DELIVERY_WRITE.DELIVERED } });

  const stage = stageOf(order.status);
  if (stage !== "ENTREGUE" && stage !== "CONCLUIDA" && stage !== "CANCELADA") {
    await prisma.order.update({ where: { id: order.id }, data: { status: ORDER_WRITE.DELIVERED } });
  }

  await addEvent(id, userId, "ENTREGUE", {
    message: [receivedBy ? `Recebido por ${receivedBy}` : "", note ?? "", !proofUrl && noProof ? `Sem foto: ${noProof}` : ""].filter(Boolean).join(". ") || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    photoUrl: proofUrl,
  });

  // O valor do transporte fica por receber até o transportador confirmar o pagamento
  const amount = Number(order.shippingCost) || 0;
  if (amount > 0) {
    const percent = Math.min(30, Math.max(0, Number(await getSetting<number>("commissions.transportPercent")) || 0));
    const commission = Math.round(amount * percent) / 100;
    await prisma.transportPayout.upsert({
      where: { deliveryId: id },
      create: {
        deliveryId: id,
        orderId: order.id,
        transporterId: userId,
        amount,
        commissionPercent: percent,
        commissionAmount: commission,
        netAmount: Math.round((amount - commission) * 100) / 100,
      },
      update: {},
    });
    await notifyUsers([userId], "Entrega concluída", `Encomenda ${shortId(order.id)}: tem ${Math.round(amount)} FCFA de transporte por receber. Confirme em Ganhos quando receber.`, id);
  }

  await notifyUsers([order.buyerId], "A sua encomenda foi entregue", `A encomenda ${shortId(order.id)} chegou. Confirme a receção no app.`, id);
  await notifyUsers([order.sellerId], "Entrega concluída", `A encomenda ${shortId(order.id)} foi entregue ao comprador.`, id);

  return getDelivery(userId, role, id);
}

// O transportador partilha onde está, para o comprador e o vendedor acompanharem
export async function updateLocation(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const { phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE" && phase !== "EM_TRANSPORTE") {
    throw new Error("Só pode partilhar a localização de uma entrega em curso.");
  }
  if (!profile.shareLocation) {
    return { id, skipped: true, reason: "PRIVACIDADE" };
  }

  const point = readPoint(input);
  if (!point) {
    throw new Error("Localização inválida.");
  }

  if (d.lastLocationAt && Date.now() - new Date(d.lastLocationAt).getTime() < LOCATION_MIN_MS) {
    return { id, skipped: true };
  }

  const region = nearestRegion(point.lat, point.lng);
  const label = clean(input?.label, 120) ?? (region ? `Perto de ${region.name}` : "Localização partilhada");

  await prisma.delivery.update({
    where: { id },
    data: { lastLocation: label, lastLat: point.lat, lastLng: point.lng, lastLocationAt: new Date() },
  });

  return { id, skipped: false, label };
}

export async function reportProblem(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE" && phase !== "EM_TRANSPORTE") {
    throw new Error("Só pode comunicar problemas de uma entrega em curso.");
  }

  const category = String(input?.category ?? "");
  if (!PROBLEM_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de problema.");
  }
  const message = clean(input?.message, 500);
  if (!message || message.length < 5) {
    throw new Error("Explique o problema (pelo menos 5 letras).");
  }
  const photoUrl = photoOf(input?.photoUrl, "Foto");

  const label = PROBLEM_KINDS.find((k) => k.value === category)?.label ?? category;
  await addEvent(id, userId, "PROBLEMA", { category, message, photoUrl });

  const name = await transporterName(userId);
  await notifyUsers(
    [order.buyerId, order.sellerId],
    "Problema na entrega",
    `${name} comunicou um problema na encomenda ${shortId(order.id)}: ${label}. ${message}`,
    id
  );

  return getDelivery(userId, role, id);
}

// =====================================================================
// Combinar entregas compatíveis: outras cargas que seguem o mesmo caminho e cabem no veículo
// =====================================================================
export async function combineDeliveries(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const d: any = await prisma.delivery.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Entrega não encontrada.");
  }
  const [base] = await hydrate([d], { userId, profile });
  if (!base || (!base.mine && base.phase !== "DISPONIVEL")) {
    throw new Error("Entrega não encontrada.");
  }

  const capacity: number | null = profile.capacityKg ?? null;
  const mineCards = await loadMineCards(userId, profile);
  const loaded = mineCards
    .filter((c) => (c.phase === "ACEITE" || c.phase === "EM_TRANSPORTE") && c.id !== id)
    .reduce((s, c) => s + c.weightKg, 0);
  const used = Math.round((loaded + base.weightKg) * 10) / 10;
  const left = capacity ? Math.max(0, Math.round((capacity - used) * 10) / 10) : null;

  const available = await loadAvailableCards(userId, profile);
  const suggestions = available
    .filter((c) => c.id !== id && c.compatibility.ok)
    .map((c) => ({
      ...c,
      samePickup: !!c.pickup.regionKey && c.pickup.regionKey === base.pickup.regionKey,
      sameDestination: !!c.destination.regionKey && c.destination.regionKey === base.destination.regionKey,
      fits: left === null ? true : c.weightKg <= left,
    }))
    .filter((c) => (c.samePickup || c.sameDestination) && c.fits)
    .sort((a, b) => Number(b.samePickup && b.sameDestination) - Number(a.samePickup && a.sameDestination) || (b.payout ?? 0) - (a.payout ?? 0))
    .slice(0, 10);

  return {
    base: {
      id: base.id,
      orderCode: base.orderCode,
      pickup: base.pickup,
      destination: base.destination,
      weightKg: base.weightKg,
      payout: base.payout,
    },
    capacityKg: capacity,
    usedKg: used,
    leftKg: left,
    suggestions,
  };
}

// =====================================================================
// Comprovativo de entrega, visto por quem participa na encomenda
// =====================================================================
export async function deliveryProof(userId: string, orderId: string) {
  const order: any = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error("Encomenda não encontrada.");
  }

  const deliveries: any[] = await prisma.delivery.findMany({ where: { orderId }, take: 10 });
  const isTransporter = deliveries.some((d) => d.transporterId === userId);
  if (order.buyerId !== userId && order.sellerId !== userId && !isTransporter) {
    throw new Error("Encomenda não encontrada.");
  }
  if (deliveries.length === 0) {
    return { orderCode: shortId(orderId), steps: [] as any[] };
  }

  const events: any[] = await prisma.deliveryEvent.findMany({
    where: { deliveryId: { in: deliveries.map((d) => d.id) }, kind: { in: ["ACEITE", "RECOLHIDA", "INICIOU", "CHEGOU", "ENTREGUE"] } },
    orderBy: { createdAt: "asc" },
  });
  const transporterIds = unique<string>(deliveries.map((d) => d.transporterId));
  const transporters = transporterIds.length ? await prisma.user.findMany({ where: { id: { in: transporterIds } }, select: { id: true, name: true } }) : [];

  return {
    orderCode: shortId(orderId),
    transporter: transporters[0] ? { id: transporters[0].id, name: transporters[0].name } : null,
    steps: events.map((e) => ({ kind: e.kind, message: e.message ?? null, photoUrl: e.photoUrl ?? null, at: e.createdAt })),
  };
}
