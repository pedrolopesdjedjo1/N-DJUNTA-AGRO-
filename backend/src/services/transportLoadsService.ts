import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { CARGO_TYPES } from "../lib/transportCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { acceptDelivery } from "./transportDeliveryService";

const DAY = 86400000;
const PAGE_SIZE = 20;
const MAX_ACTIVE_OFFERS = 5;
const CARGO_VALUES = values(CARGO_TYPES);
const REGION_KEYS = REGIONS.map((r) => r.key);

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}
function firstName(name?: string | null): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "Cliente";
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function regionKey(text: string | null, given?: any): string | null {
  const keyFromText = findRegion(text)?.key ?? null;
  if (keyFromText) return keyFromText;
  return given && REGION_KEYS.includes(String(given)) ? String(given) : null;
}

function readOffer(input: any, profile: any) {
  const fromText = clean(input?.fromText, 120);
  const toText = clean(input?.toText, 120);
  if (!fromText || fromText.length < 2 || !toText || toText.length < 2) {
    throw new Error("Indique de onde parte e para onde vai.");
  }

  const date = String(input?.departureDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Indique a data de partida (AAAA-MM-DD).");
  }
  const departureDate = new Date(`${date}T00:00:00.000`);
  if (isNaN(departureDate.getTime()) || departureDate.getTime() < startOfDay(new Date()).getTime()) {
    throw new Error("A data de partida não pode ser no passado.");
  }
  if (departureDate.getTime() - Date.now() > 60 * DAY) {
    throw new Error("A data de partida pode ser até 60 dias à frente.");
  }

  const capacityKg = Number(String(input?.capacityKg ?? "").replace(",", "."));
  if (isNaN(capacityKg) || capacityKg <= 0) {
    throw new Error("Indique quantos quilos tem livres.");
  }
  if (capacityKg > profile.capacityKg) {
    throw new Error(`Não pode oferecer mais do que a capacidade do seu veículo (${profile.capacityKg} kg).`);
  }

  const cargoTypes = Array.isArray(input?.cargoTypes) && input.cargoTypes.length > 0 ? (Array.from(new Set(input.cargoTypes.map(String))) as string[]) : profile.cargoTypes;
  if (!cargoTypes.every((c: string) => CARGO_VALUES.includes(c))) {
    throw new Error("Tipo de produto inválido.");
  }

  let price: number | null = null;
  if (input?.price !== undefined && input.price !== null && input.price !== "") {
    price = Number(String(input.price).replace(",", "."));
    if (isNaN(price) || price < 0 || price > 100000000) {
      throw new Error("Preço inválido.");
    }
  }

  return {
    fromText,
    fromRegionKey: regionKey(fromText, input?.fromRegionKey),
    toText,
    toRegionKey: regionKey(toText, input?.toRegionKey),
    departureDate,
    capacityKg,
    cargoTypes,
    price,
    notes: clean(input?.notes, 300),
  };
}

// =====================================================================
// As minhas ofertas de transporte
// =====================================================================
export async function listMyOffers(userId: string, role: string | undefined) {
  assertTransporter(role);

  const offers = await prisma.transportOffer.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const pending = offers.length
    ? await prisma.transportRequest.groupBy({ by: ["offerId"], where: { offerId: { in: offers.map((o) => o.id) }, status: "PENDENTE" }, _count: { _all: true } })
    : [];
  const pendingMap = new Map(pending.map((p) => [p.offerId, p._count._all]));
  const today = startOfDay(new Date()).getTime() - DAY;

  return offers.map((o) => ({
    ...o,
    expired: o.status === "ATIVA" && new Date(o.departureDate).getTime() < today,
    pendingRequests: pendingMap.get(o.id) ?? 0,
  }));
}

export async function createOffer(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  if (!profile.vehicleType || !profile.capacityKg || profile.vehicleStatus !== "OPERACIONAL") {
    throw new Error("Registe o veículo e a capacidade de carga (e ponha-o operacional) antes de publicar ofertas.");
  }

  const active = await prisma.transportOffer.count({ where: { transporterId: userId, status: "ATIVA", departureDate: { gte: new Date(startOfDay(new Date()).getTime() - DAY) } } });
  if (active >= MAX_ACTIVE_OFFERS) {
    throw new Error(`Já tem ${MAX_ACTIVE_OFFERS} ofertas ativas. Encerre alguma antes.`);
  }

  return prisma.transportOffer.create({ data: { transporterId: userId, ...readOffer(input, profile) } });
}

export async function updateOffer(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const found = await prisma.transportOffer.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Oferta não encontrada.");
  }
  if (found.status !== "ATIVA") {
    throw new Error("Esta oferta já foi encerrada.");
  }

  return prisma.transportOffer.update({ where: { id }, data: readOffer(input, profile) });
}

export async function closeOffer(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);

  const found = await prisma.transportOffer.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Oferta não encontrada.");
  }

  await prisma.transportOffer.update({ where: { id }, data: { status: "ENCERRADA" } });
  await prisma.transportRequest.updateMany({
    where: { offerId: id, status: "PENDENTE" },
    data: { status: "RECUSADA", response: "A oferta foi encerrada." },
  });
  return { id, closed: true };
}

// =====================================================================
// Pedidos de transporte recebidos nas minhas ofertas
// =====================================================================
export async function listRequests(userId: string, role: string | undefined, filters: { status?: string }) {
  assertTransporter(role);

  const offers = await prisma.transportOffer.findMany({ where: { transporterId: userId }, select: { id: true, fromText: true, toText: true, departureDate: true } });
  if (offers.length === 0) return { counts: {} as Record<string, number>, items: [] as any[] };
  const offerMap = new Map(offers.map((o) => [o.id, o]));

  const rows = await prisma.transportRequest.findMany({ where: { offerId: { in: offers.map((o) => o.id) } }, orderBy: { createdAt: "desc" }, take: 200 });
  const counts: Record<string, number> = {};
  rows.forEach((r) => (counts[r.status] = (counts[r.status] ?? 0) + 1));

  const people = rows.length
    ? await prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.requesterId))) } }, select: { id: true, name: true, location: true, role: true, isVerified: true } })
    : [];
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const list = filters.status ? rows.filter((r) => r.status === filters.status) : rows;
  return {
    counts,
    items: list.map((r) => {
      const o = offerMap.get(r.offerId);
      const p = peopleMap.get(r.requesterId);
      return {
        id: r.id,
        offerId: r.offerId,
        route: o ? `${o.fromText} → ${o.toText}` : null,
        departureDate: o?.departureDate ?? null,
        requester: p ? { id: p.id, name: p.name, location: p.location, isVerified: p.isVerified } : null,
        orderId: r.orderId,
        orderCode: r.orderId ? shortId(r.orderId) : null,
        message: r.message,
        status: r.status,
        response: r.response,
        createdAt: r.createdAt,
      };
    }),
  };
}

// Aceitar ou recusar. Se o pedido traz uma encomenda com entrega por aceitar, ao aceitar a entrega fica sua.
export async function respondRequest(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const r = await prisma.transportRequest.findUnique({ where: { id } });
  const offer = r ? await prisma.transportOffer.findUnique({ where: { id: r.offerId } }) : null;
  if (!r || !offer || offer.transporterId !== userId) {
    throw new Error("Pedido não encontrado.");
  }
  if (r.status !== "PENDENTE") {
    throw new Error("Este pedido já foi respondido.");
  }

  const accept = input?.accept === true;
  const response = clean(input?.message, 300);
  if (!accept && (!response || response.length < 3)) {
    throw new Error("Explique porque recusa, para a pessoa perceber.");
  }

  let assigned = false;
  if (accept && r.orderId) {
    const delivery: any = await prisma.delivery.findFirst({ where: { orderId: r.orderId, transporterId: null } });
    if (delivery) {
      try {
        await acceptDelivery(userId, role, delivery.id);
        assigned = true;
      } catch (error: any) {
        throw new Error(`Não foi possível ficar com a entrega: ${error.message}`);
      }
    }
  }

  await prisma.transportRequest.update({ where: { id }, data: { status: accept ? "ACEITE" : "RECUSADA", response } });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.notification.create({
    data: {
      userId: r.requesterId,
      type: "SISTEMA",
      title: accept ? "O transportador aceitou o seu pedido" : "O transportador recusou o seu pedido",
      message: accept
        ? `${me?.name ?? "O transportador"} aceitou transportar ${offer.fromText} → ${offer.toText}.${assigned ? " A entrega já é dele." : " Combine os detalhes por mensagem."}`
        : `${me?.name ?? "O transportador"}: ${response}`,
      relatedId: id,
    },
  });

  return { id, status: accept ? "ACEITE" : "RECUSADA", assigned };
}

// =====================================================================
// Para todas as pessoas: ver ofertas e pedir transporte
// =====================================================================
export async function listPublicOffers(viewerId: string, filters: { region?: string; cargo?: string; q?: string; page?: number }) {
  const where: any = { status: "ATIVA", departureDate: { gte: new Date(startOfDay(new Date()).getTime() - DAY) } };
  if (filters.region && REGION_KEYS.includes(filters.region)) where.OR = [{ fromRegionKey: filters.region }, { toRegionKey: filters.region }];
  if (filters.cargo && CARGO_VALUES.includes(filters.cargo)) where.cargoTypes = { has: filters.cargo };

  const rows = await prisma.transportOffer.findMany({ where, orderBy: { departureDate: "asc" }, take: 300 });
  const owners = rows.length
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(new Set(rows.map((o) => o.transporterId))) }, isActive: true },
        select: { id: true, name: true, photoUrl: true, location: true, isVerified: true },
      })
    : [];
  const ownerMap = new Map(owners.map((o) => [o.id, o]));
  const profiles = owners.length ? await prisma.transporterProfile.findMany({ where: { userId: { in: owners.map((o) => o.id) } } }) : [];
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const needle = plain(filters.q);
  const list = rows
    .filter((o) => ownerMap.has(o.transporterId))
    .filter((o) => !needle || plain(`${o.fromText} ${o.toText} ${ownerMap.get(o.transporterId)?.name}`).includes(needle));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o) => ({
      id: o.id,
      fromText: o.fromText,
      toText: o.toText,
      departureDate: o.departureDate,
      capacityKg: o.capacityKg,
      cargoTypes: o.cargoTypes,
      price: o.price,
      notes: o.notes,
      isMine: o.transporterId === viewerId,
      transporter: {
        id: o.transporterId,
        name: ownerMap.get(o.transporterId)!.name,
        photoUrl: ownerMap.get(o.transporterId)!.photoUrl,
        isVerified: ownerMap.get(o.transporterId)!.isVerified,
        vehicleType: profileMap.get(o.transporterId)?.vehicleType ?? null,
      },
    })),
  };
}

export async function createRequest(viewerId: string, offerId: string, input: any) {
  const offer = await prisma.transportOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== "ATIVA") {
    throw new Error("Esta oferta já não está disponível.");
  }
  if (offer.transporterId === viewerId) {
    throw new Error("Não pode pedir transporte à sua própria oferta.");
  }

  const message = clean(input?.message, 300);
  if (!message || message.length < 5) {
    throw new Error("Explique o que quer transportar (pelo menos 5 letras).");
  }

  let orderId: string | null = null;
  if (input?.orderId) {
    const order: any = await prisma.order.findUnique({ where: { id: String(input.orderId) } });
    if (!order || (order.buyerId !== viewerId && order.sellerId !== viewerId)) {
      throw new Error("Só pode ligar o pedido a uma encomenda em que participa.");
    }
    orderId = order.id;
  }

  const dup = await prisma.transportRequest.findFirst({ where: { offerId, requesterId: viewerId, status: "PENDENTE", orderId } });
  if (dup) {
    throw new Error("Já enviou um pedido a esta oferta e está à espera de resposta.");
  }
  const today = await prisma.transportRequest.count({ where: { requesterId: viewerId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (today >= 10) {
    throw new Error("Já enviou muitos pedidos hoje. Tente amanhã.");
  }

  const created = await prisma.transportRequest.create({ data: { offerId, requesterId: viewerId, orderId, message } });
  const me = await prisma.user.findUnique({ where: { id: viewerId }, select: { name: true } });
  await prisma.notification.create({
    data: {
      userId: offer.transporterId,
      type: "SISTEMA",
      title: "Novo pedido de transporte",
      message: `${firstName(me?.name)} quer transportar na sua oferta ${offer.fromText} → ${offer.toText}: ${message}`.slice(0, 300),
      relatedId: created.id,
    },
  });

  return { id: created.id, status: created.status };
}

export async function myRequests(viewerId: string) {
  const rows = await prisma.transportRequest.findMany({ where: { requesterId: viewerId }, orderBy: { createdAt: "desc" }, take: 50 });
  const offers = rows.length ? await prisma.transportOffer.findMany({ where: { id: { in: rows.map((r) => r.offerId) } } }) : [];
  const offerMap = new Map(offers.map((o) => [o.id, o]));
  const owners = offers.length ? await prisma.user.findMany({ where: { id: { in: offers.map((o) => o.transporterId) } }, select: { id: true, name: true } }) : [];
  const ownerMap = new Map(owners.map((o) => [o.id, o.name]));

  return rows.map((r) => {
    const o = offerMap.get(r.offerId);
    return {
      id: r.id,
      route: o ? `${o.fromText} → ${o.toText}` : null,
      departureDate: o?.departureDate ?? null,
      transporter: o ? { id: o.transporterId, name: ownerMap.get(o.transporterId) ?? "Transportador" } : null,
      message: r.message,
      status: r.status,
      response: r.response,
      createdAt: r.createdAt,
    };
  });
}
