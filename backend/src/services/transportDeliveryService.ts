import { prisma } from "../lib/prisma";
import { REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { stageOf } from "../lib/agentOpsCatalog";
import { clean, plain, safe } from "../lib/agentScope";
import {
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
  deliveryPhase,
  distanceKm,
  pickNumber,
  pickText,
} from "../lib/transportCatalog";
import { values } from "../lib/ngoCatalog";
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

interface Ctx {
  userId: string;
  profile: any;
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

function pointOf(p: Place): { lat: number; lng: number } | null {
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
  extra: { category?: string | null; message?: string | null; lat?: number | null; lng?: number | null } = {}
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
    },
  });
}

// =====================================================================
// Monta os cartões das entregas (encomenda, produtos, locais, valor)
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
    ? await safe("produtos", async () => (await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, unit: true } })) as any[], [] as any[])
    : [];
  const unitMap = new Map(products.map((p) => [p.id, p.unit ? String(p.unit).trim().toLowerCase() : null]));

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

  return rows.map((d) => {
    const order = orderMap.get(d.orderId) ?? null;
    const phase = deliveryPhase(d, order);
    const mine = !!d.transporterId && d.transporterId === ctx.userId;
    const seller = order ? people.get(order.sellerId) : undefined;
    const buyer = order ? people.get(order.buyerId) : undefined;

    const pickup = buildPlace(
      pickText([d, order], PICKUP_TEXT),
      pickNumber([d, order], PICKUP_LAT),
      pickNumber([d, order], PICKUP_LNG),
      seller?.location ?? null
    );
    const destination = buildPlace(
      pickText([d, order], DEST_TEXT),
      pickNumber([d, order], DEST_LAT),
      pickNumber([d, order], DEST_LNG),
      buyer?.location ?? null
    );
    const dist = distanceOf(pickup, destination);

    const its = items
      .filter((i) => i.orderId === d.orderId)
      .map((i) => ({
        id: i.id,
        title: String(i.title ?? "Produto"),
        quantity: Number(i.quantity) || 0,
        unit: unitMap.get(i.productId) ?? (i.unit ? String(i.unit) : null),
      }));

    let weightKg = 0;
    let unknownUnits = 0;
    its.forEach((i) => {
      const factor = i.unit ? KG_FACTOR[String(i.unit).toLowerCase()] : undefined;
      if (factor) weightKg += i.quantity * factor;
      else unknownUnits += 1;
    });
    weightKg = Math.round(weightKg * 10) / 10;

    const capacity = ctx.profile?.capacityKg ?? null;
    const regions: string[] = ctx.profile?.regions ?? [];
    const payoutRaw = order?.shippingCost;
    const payout = payoutRaw !== null && payoutRaw !== undefined && !isNaN(Number(payoutRaw)) ? Number(payoutRaw) : null;
    const stage = order ? stageOf(order.status) : "NOVA";

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
      items: its,
      itemsCount: its.length,
      weightKg,
      weightPartial: unknownUnits > 0,
      overCapacity: !!capacity && weightKg > capacity,
      matchesMyRegions:
        regions.length === 0 || [pickup.regionKey, destination.regionKey].some((k) => !!k && regions.includes(k as string)),
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

export async function loadMineCards(userId: string, profile: any) {
  const rows: any[] = await prisma.delivery.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" }, take: 500 });
  return hydrate(rows, { userId, profile });
}

// Entregas por aceitar (sem transportador) e que o próprio ainda não recusou
export async function loadAvailableCards(userId: string, profile: any) {
  const [rows, dismissed]: [any[], { deliveryId: string }[]] = await Promise.all([
    prisma.delivery.findMany({ where: { transporterId: null }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.deliveryDismissal.findMany({ where: { transporterId: userId }, select: { deliveryId: true } }),
  ]);

  const hidden = new Set(dismissed.map((x) => x.deliveryId));
  const open = rows.filter((d) => !hidden.has(d.id) && deliveryPhase(d) === "DISPONIVEL");
  const cards = await hydrate(open, { userId, profile });
  return cards.filter((c) => c.phase === "DISPONIVEL" && !!c.orderId);
}

// =====================================================================
// Entregas disponíveis
// =====================================================================
export async function listAvailable(
  userId: string,
  role: string | undefined,
  filters: { scope?: string; region?: string; fit?: string; q?: string; sort?: string; page?: number }
) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const all = await loadAvailableCards(userId, profile);
  const matching = all.filter((c) => c.matchesMyRegions);

  let list = filters.scope === "all" || profile.regions.length === 0 ? all : matching;
  if (filters.region) list = list.filter((c) => c.pickup.regionKey === filters.region || c.destination.regionKey === filters.region);
  if (filters.fit === "yes") list = list.filter((c) => !c.overCapacity);

  const needle = plain(filters.q);
  if (needle) {
    list = list.filter((c) =>
      plain(`${c.items.map((i: any) => i.title).join(" ")} ${c.pickup.text} ${c.destination.text} ${c.orderCode}`).includes(needle)
    );
  }

  if (filters.sort === "VALOR") list = [...list].sort((a, b) => (b.payout ?? -1) - (a.payout ?? -1));
  else if (filters.sort === "PERTO") list = [...list].sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));

  const total = list.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    summary: {
      all: all.length,
      matching: matching.length,
      overCapacity: all.filter((c) => c.overCapacity).length,
      totalPayout: Math.round(matching.reduce((s, c) => s + (c.payout ?? 0), 0)),
      isAvailable: profile.isAvailable,
      hasRegions: profile.regions.length > 0,
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
export async function listMine(
  userId: string,
  role: string | undefined,
  filters: { phase?: string; q?: string; page?: number }
) {
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

  // As próximas por data pretendida; as concluídas pela data de entrega
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
  const dismissed =
    !mine && (await prisma.deliveryDismissal.findUnique({ where: { transporterId_deliveryId: { transporterId: userId, deliveryId: id } } }));

  return {
    delivery: card,
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      category: e.category,
      message: e.message,
      createdAt: e.createdAt,
      authorName: e.actorId === userId ? "Você" : names.get(e.actorId) ?? "Utilizador",
    })),
    actions: {
      canAccept: card.phase === "DISPONIVEL" && profile.isAvailable && !dismissed,
      canDecline: card.phase === "DISPONIVEL" && !dismissed,
      canRelease: mine && card.phase === "ACEITE",
      canCollect: mine && card.phase === "ACEITE",
      canDeliver: mine && card.phase === "EM_TRANSPORTE",
      canShareLocation: mine && active,
      canReportProblem: mine && active,
    },
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

  const { order, phase } = await loadFor(id);
  if (phase !== "DISPONIVEL") {
    throw new Error("Esta entrega já não está disponível.");
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

// Desistir de uma entrega aceite, antes de recolher: volta a ficar disponível para os outros
export async function releaseDelivery(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE") {
    throw new Error(phase === "EM_TRANSPORTE" ? "Já recolheu os produtos. Comunique um problema em vez de desistir." : "Esta entrega já não pode ser devolvida.");
  }

  const reason = String(input?.reason ?? "");
  if (!RELEASE_VALUES.includes(reason)) {
    throw new Error("Escolha o motivo da desistência.");
  }
  const note = clean(input?.message, 300);
  const label = RELEASE_REASONS.find((r) => r.value === reason)?.label ?? reason;

  const released = await prisma.delivery.updateMany({
    where: { id, transporterId: userId },
    data: { transporterId: null, status: DELIVERY_WRITE.PENDING },
  });
  if (released.count === 0) {
    throw new Error("Não foi possível devolver a entrega.");
  }

  await prisma.deliveryDismissal.upsert({
    where: { transporterId_deliveryId: { transporterId: userId, deliveryId: id } },
    create: { transporterId: userId, deliveryId: id },
    update: {},
  });
  await addEvent(id, userId, "DESISTIU", { category: reason, message: note ? `${label}. ${note}` : label });

  await notifyUsers(
    [order.buyerId, order.sellerId],
    "A entrega voltou a ficar disponível",
    `O transportador desistiu da encomenda ${shortId(order.id)}. Estamos a procurar outro.`,
    id
  );

  return { id, released: true };
}

export async function collectDelivery(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { order, phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE") {
    throw new Error(phase === "EM_TRANSPORTE" ? "Já confirmou a recolha." : "Esta entrega não está por recolher.");
  }

  await prisma.delivery.update({ where: { id }, data: { status: DELIVERY_WRITE.IN_TRANSIT } });
  await addEvent(id, userId, "RECOLHIDA", { message: clean(input?.message, 300) });

  const name = await transporterName(userId);
  await notifyUsers([order.buyerId], "A sua encomenda está a caminho", `${name} recolheu a encomenda ${shortId(order.id)} e vai entregá-la.`, id);

  return getDelivery(userId, role, id);
}

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

  const receivedBy = clean(input?.receivedBy, 80);
  const note = clean(input?.message, 300);
  const lat = input?.lat !== undefined && input?.lat !== null && input?.lat !== "" ? Number(input.lat) : null;
  const lng = input?.lng !== undefined && input?.lng !== null && input?.lng !== "" ? Number(input.lng) : null;
  const point = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  await prisma.delivery.update({ where: { id }, data: { status: DELIVERY_WRITE.DELIVERED } });

  const stage = stageOf(order.status);
  if (stage !== "ENTREGUE" && stage !== "CONCLUIDA" && stage !== "CANCELADA") {
    await prisma.order.update({ where: { id: order.id }, data: { status: ORDER_WRITE.DELIVERED } });
  }

  await addEvent(id, userId, "ENTREGUE", {
    message: [receivedBy ? `Recebido por ${receivedBy}` : "", note ?? ""].filter(Boolean).join(". ") || null,
    lat: point ? lat : null,
    lng: point ? lng : null,
  });

  await notifyUsers(
    [order.buyerId],
    "A sua encomenda foi entregue",
    `A encomenda ${shortId(order.id)} chegou. Confirme a receção no app.`,
    id
  );
  await notifyUsers([order.sellerId], "Entrega concluída", `A encomenda ${shortId(order.id)} foi entregue ao comprador.`, id);

  return getDelivery(userId, role, id);
}

// O transportador partilha onde está, para o comprador e o vendedor acompanharem
export async function updateLocation(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const { phase, d } = await loadFor(id);
  if (d.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (phase !== "ACEITE" && phase !== "EM_TRANSPORTE") {
    throw new Error("Só pode partilhar a localização de uma entrega em curso.");
  }

  const lat = Number(input?.lat);
  const lng = Number(input?.lng);
  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Localização inválida.");
  }

  if (d.lastLocationAt && Date.now() - new Date(d.lastLocationAt).getTime() < LOCATION_MIN_MS) {
    return { id, skipped: true };
  }

  const region = nearestRegion(lat, lng);
  const label = clean(input?.label, 120) ?? (region ? `Perto de ${region.name}` : "Localização partilhada");

  await prisma.delivery.update({
    where: { id },
    data: { lastLocation: label, lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
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

  const label = PROBLEM_KINDS.find((k) => k.value === category)?.label ?? category;
  await addEvent(id, userId, "PROBLEMA", { category, message });

  const name = await transporterName(userId);
  await notifyUsers(
    [order.buyerId, order.sellerId],
    "Problema na entrega",
    `${name} comunicou um problema na encomenda ${shortId(order.id)}: ${label}. ${message}`,
    id
  );

  return getDelivery(userId, role, id);
}
