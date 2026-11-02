import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean, plain, safe } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { CARGO_TYPES } from "../lib/transportCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { acceptDelivery } from "./transportDeliveryService";

const DAY = 86400000;
const MAX_ACTIVE = 10;
const CARGO_VALUES = values(CARGO_TYPES);
const REGION_KEYS = REGIONS.map((r) => r.key);

function place(text: string | null, key: string | null) {
  const region = REGIONS.find((r) => r.key === key) ?? findRegion(text);
  return { text: text ?? null, regionKey: region?.key ?? null, regionName: region?.name ?? null };
}

function readDate(value: any): Date {
  const d = value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00.000` : value) : null;
  if (!d || isNaN(d.getTime())) {
    throw new Error("Indique a data da viagem.");
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) {
    throw new Error("A data da viagem não pode ser no passado.");
  }
  if (d.getTime() > today.getTime() + 90 * DAY) {
    throw new Error("Só pode anunciar viagens dos próximos 90 dias.");
  }
  return d;
}

function shapeOffer(o: any) {
  return {
    id: o.id,
    transporterId: o.transporterId,
    from: place(o.fromText, o.fromRegionKey),
    to: place(o.toText, o.toRegionKey),
    travelDate: o.travelDate,
    capacityKg: o.capacityKg,
    cargoTypes: o.cargoTypes,
    price: o.price ?? null,
    notes: o.notes ?? null,
    status: o.status,
    expired: new Date(o.travelDate).getTime() < Date.now() - DAY,
    createdAt: o.createdAt,
  };
}

function readOffer(input: any, profile: any) {
  const fromText = clean(input?.fromText, 120);
  const toText = clean(input?.toText, 120);
  const fromKey = input?.fromRegionKey ? String(input.fromRegionKey) : null;
  const toKey = input?.toRegionKey ? String(input.toRegionKey) : null;

  if ((fromKey && !REGION_KEYS.includes(fromKey)) || (toKey && !REGION_KEYS.includes(toKey))) {
    throw new Error("Região inválida.");
  }
  if (!fromText && !fromKey) throw new Error("Indique de onde parte.");
  if (!toText && !toKey) throw new Error("Indique para onde vai.");

  const capacity = Number(String(input?.capacityKg ?? "").replace(",", "."));
  if (isNaN(capacity) || capacity <= 0) {
    throw new Error("Indique o espaço livre em quilos.");
  }
  if (profile.capacityKg && capacity > profile.capacityKg) {
    throw new Error(`O espaço livre não pode passar a capacidade do veículo (${profile.capacityKg} kg).`);
  }

  const cargo = Array.isArray(input?.cargoTypes) ? (Array.from(new Set(input.cargoTypes.map(String))) as string[]) : [];
  if (!cargo.every((c) => CARGO_VALUES.includes(c))) {
    throw new Error("Tipo de produto inválido.");
  }
  if (profile.cargoTypes.length > 0 && cargo.some((c) => !profile.cargoTypes.includes(c))) {
    throw new Error("Só pode oferecer os tipos de produto que o seu veículo transporta.");
  }

  let price: number | null = null;
  if (input?.price !== undefined && input.price !== null && input.price !== "") {
    price = Number(String(input.price).replace(",", "."));
    if (isNaN(price) || price < 0 || price > 100000000) throw new Error("Preço inválido.");
  }

  return {
    fromText,
    fromRegionKey: fromKey ?? findRegion(fromText)?.key ?? null,
    toText,
    toRegionKey: toKey ?? findRegion(toText)?.key ?? null,
    travelDate: readDate(input?.travelDate),
    capacityKg: capacity,
    cargoTypes: cargo.length > 0 ? cargo : profile.cargoTypes,
    price,
    notes: clean(input?.notes, 300),
  };
}

// =====================================================================
// O transportador: as suas ofertas de transporte
// =====================================================================
export async function listMyOffers(userId: string, role: string | undefined) {
  assertTransporter(role);

  const rows = await prisma.transportOffer.findMany({ where: { transporterId: userId }, orderBy: [{ status: "asc" }, { travelDate: "asc" }], take: 100 });
  const pending = rows.length ? await prisma.transportProposal.groupBy({ by: ["offerId"], where: { offerId: { in: rows.map((r) => r.id) }, status: "PENDENTE" }, _count: { _all: true } }) : [];
  const pendingMap = new Map(pending.map((p) => [p.offerId, p._count._all]));

  return {
    max: MAX_ACTIVE,
    items: rows.map((o) => ({ ...shapeOffer(o), pendingProposals: pendingMap.get(o.id) ?? 0 })),
  };
}

export async function createOffer(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  if (!profile.vehicleType || !profile.capacityKg) {
    throw new Error("Registe o veículo e a capacidade de carga antes de oferecer transporte.");
  }
  if (profile.vehicleStatus !== "OPERACIONAL") {
    throw new Error("O veículo está em manutenção ou avariado. Ponha-o operacional antes de oferecer transporte.");
  }

  const active = await prisma.transportOffer.count({ where: { transporterId: userId, status: "ATIVA", travelDate: { gte: new Date(Date.now() - DAY) } } });
  if (active >= MAX_ACTIVE) {
    throw new Error(`Já tem ${MAX_ACTIVE} ofertas ativas. Encerre algumas antes de criar outra.`);
  }

  const created = await prisma.transportOffer.create({ data: { transporterId: userId, ...readOffer(input, profile) } });
  return shapeOffer(created);
}

export async function updateOffer(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const found = await prisma.transportOffer.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Oferta não encontrada.");
  }
  if (found.status !== "ATIVA") {
    throw new Error("Só se editam ofertas ativas.");
  }

  const updated = await prisma.transportOffer.update({ where: { id }, data: readOffer({ ...shapeInputOf(found), ...input }, profile) });
  return shapeOffer(updated);
}

function shapeInputOf(o: any) {
  return {
    fromText: o.fromText,
    fromRegionKey: o.fromRegionKey,
    toText: o.toText,
    toRegionKey: o.toRegionKey,
    travelDate: new Date(o.travelDate).toISOString().slice(0, 10),
    capacityKg: o.capacityKg,
    cargoTypes: o.cargoTypes,
    price: o.price,
    notes: o.notes,
  };
}

export async function closeOffer(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);
  const found = await prisma.transportOffer.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Oferta não encontrada.");
  }

  await prisma.transportOffer.update({ where: { id }, data: { status: "ENCERRADA" } });
  return { id, closed: true };
}

// =====================================================================
// Quem recebeu propostas: aceitar ou recusar
// =====================================================================
export async function listProposals(userId: string, role: string | undefined, filters: { status?: string }) {
  assertTransporter(role);

  const offers = await prisma.transportOffer.findMany({ where: { transporterId: userId }, select: { id: true, fromText: true, fromRegionKey: true, toText: true, toRegionKey: true, travelDate: true } });
  const offerMap = new Map(offers.map((o) => [o.id, o]));
  if (offers.length === 0) return { counts: {}, items: [] as any[] };

  const where: any = { offerId: { in: offers.map((o) => o.id) } };
  if (filters.status) where.status = filters.status;

  const [rows, groups] = await Promise.all([
    prisma.transportProposal.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.transportProposal.groupBy({ by: ["status"], where: { offerId: { in: offers.map((o) => o.id) } }, _count: { _all: true } }),
  ]);

  const people = rows.length
    ? await prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.fromId))) } }, select: { id: true, name: true, role: true, location: true, phone: true, isVerified: true } })
    : [];
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  return {
    counts,
    items: rows.map((r) => {
      const o = offerMap.get(r.offerId);
      const p = peopleMap.get(r.fromId);
      return {
        id: r.id,
        offerId: r.offerId,
        route: o ? `${place(o.fromText, o.fromRegionKey).regionName ?? o.fromText ?? "—"} → ${place(o.toText, o.toRegionKey).regionName ?? o.toText ?? "—"}` : "—",
        travelDate: o?.travelDate ?? null,
        orderId: r.orderId,
        orderCode: r.orderId ? `#${String(r.orderId).slice(-6).toUpperCase()}` : null,
        message: r.message,
        status: r.status,
        responseNote: r.responseNote,
        createdAt: r.createdAt,
        from: p ? { id: p.id, name: p.name, location: p.location, isVerified: p.isVerified, phone: r.status === "ACEITA" ? p.phone : null } : null,
      };
    }),
  };
}

export async function respondProposal(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const proposal = await prisma.transportProposal.findUnique({ where: { id } });
  const offer = proposal ? await prisma.transportOffer.findUnique({ where: { id: proposal.offerId } }) : null;
  if (!proposal || !offer || offer.transporterId !== userId) {
    throw new Error("Proposta não encontrada.");
  }
  if (proposal.status !== "PENDENTE") {
    throw new Error("Esta proposta já foi respondida.");
  }

  const accept = input?.accept === true;
  const note = clean(input?.message, 300);
  if (!accept && (!note || note.length < 3)) {
    throw new Error("Explique porque recusa, para a pessoa perceber.");
  }

  // Se a proposta é sobre uma encomenda com entrega por aceitar, aceita-se a entrega já
  let assigned = false;
  if (accept && proposal.orderId) {
    const open: any = await prisma.delivery.findFirst({ where: { orderId: proposal.orderId, transporterId: null } });
    if (open) {
      try {
        await acceptDelivery(userId, role, open.id);
        assigned = true;
      } catch (error: any) {
        throw new Error(`Não foi possível aceitar a entrega: ${error.message}`);
      }
    }
  }

  await prisma.transportProposal.update({ where: { id }, data: { status: accept ? "ACEITA" : "RECUSADA", responseNote: note, respondedAt: new Date() } });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.notification.create({
    data: {
      userId: proposal.fromId,
      type: "SISTEMA",
      title: accept ? "O transportador aceitou a sua proposta" : "O transportador recusou a sua proposta",
      message: accept
        ? `${me?.name ?? "O transportador"} aceitou.${assigned ? " A entrega já ficou com ele." : " Combinem os detalhes pelas mensagens."}${note ? ` ${note}` : ""}`.slice(0, 300)
        : `${me?.name ?? "O transportador"}: ${note}`.slice(0, 300),
      relatedId: offer.id,
    },
  });

  return { id, status: accept ? "ACEITA" : "RECUSADA", assigned };
}

// =====================================================================
// Para todas as pessoas: ver ofertas de transporte e fazer propostas
// =====================================================================
export async function listPublicOffers(
  viewerId: string,
  filters: { fromRegion?: string; toRegion?: string; cargo?: string; from?: string; to?: string; q?: string; page?: number }
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const rows = await prisma.transportOffer.findMany({ where: { status: "ATIVA", travelDate: { gte: start } }, orderBy: { travelDate: "asc" }, take: 300 });

  const ids = Array.from(new Set(rows.map((r) => r.transporterId)));
  const [users, profiles, ratings] = ids.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true, photoUrl: true, isVerified: true, location: true } }),
        prisma.transporterProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, vehicleType: true, vehicleStatus: true } }),
        safe("avaliações", async () => prisma.review.groupBy({ by: ["targetId"], where: { targetId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } }), [] as any[]),
      ])
    : [[], [], []];
  const userMap = new Map((users as any[]).map((u) => [u.id, u]));
  const profileMap = new Map((profiles as any[]).map((p) => [p.userId, p]));
  const ratingMap = new Map((ratings as any[]).map((r) => [r.targetId, { average: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, count: r._count._all }]));

  const needle = plain(filters.q);
  const fromDate = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? new Date(`${filters.from}T00:00:00.000`) : null;
  const toDate = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? new Date(`${filters.to}T23:59:59.999`) : null;

  let list = rows
    .filter((o) => userMap.has(o.transporterId) && profileMap.get(o.transporterId)?.vehicleStatus === "OPERACIONAL")
    .map((o) => {
      const u = userMap.get(o.transporterId);
      return {
        ...shapeOffer(o),
        isMine: o.transporterId === viewerId,
        transporter: { id: u.id, name: u.name, photoUrl: u.photoUrl, isVerified: u.isVerified, location: u.location, vehicleType: profileMap.get(o.transporterId)?.vehicleType ?? null, rating: ratingMap.get(o.transporterId) ?? { average: null, count: 0 } },
      };
    });

  if (filters.fromRegion) list = list.filter((o) => o.from.regionKey === filters.fromRegion);
  if (filters.toRegion) list = list.filter((o) => o.to.regionKey === filters.toRegion);
  if (filters.cargo) list = list.filter((o) => o.cargoTypes.length === 0 || o.cargoTypes.includes(filters.cargo as string));
  if (fromDate) list = list.filter((o) => new Date(o.travelDate) >= fromDate);
  if (toDate) list = list.filter((o) => new Date(o.travelDate) <= toDate);
  if (needle) list = list.filter((o) => plain(`${o.from.text} ${o.from.regionName} ${o.to.text} ${o.to.regionName} ${o.transporter.name} ${o.notes}`).includes(needle));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return { total: list.length, page, pageSize: 20, items: list.slice((page - 1) * 20, page * 20) };
}

export async function proposeToOffer(userId: string, offerId: string, input: any) {
  const offer = await prisma.transportOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== "ATIVA") {
    throw new Error("Esta oferta já não está ativa.");
  }
  if (offer.transporterId === userId) {
    throw new Error("Não pode fazer uma proposta à sua própria oferta.");
  }

  const message = clean(input?.message, 300);
  if (!message || message.length < 5) {
    throw new Error("Escreva a proposta (pelo menos 5 letras).");
  }

  let orderId: string | null = null;
  if (input?.orderId) {
    const order: any = await prisma.order.findUnique({ where: { id: String(input.orderId) } });
    if (!order || (order.buyerId !== userId && order.sellerId !== userId)) {
      throw new Error("Só pode ligar a proposta a uma encomenda em que participa.");
    }
    orderId = order.id;
  }

  const duplicate = await prisma.transportProposal.findFirst({ where: { offerId, fromId: userId, status: "PENDENTE", orderId } });
  if (duplicate) {
    throw new Error("Já enviou uma proposta a esta oferta e ainda está por responder.");
  }
  const today = await prisma.transportProposal.count({ where: { fromId: userId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (today >= 10) {
    throw new Error("Já enviou muitas propostas hoje. Tente amanhã.");
  }

  const proposal = await prisma.transportProposal.create({ data: { offerId, fromId: userId, orderId, message } });

  const from = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.notification.create({
    data: {
      userId: offer.transporterId,
      type: "SISTEMA",
      title: "Nova proposta de transporte",
      message: `${from?.name ?? "Alguém"}: ${message}`.slice(0, 300),
      relatedId: proposal.id,
    },
  });

  return { id: proposal.id, status: proposal.status };
}

export async function myProposalsSent(userId: string) {
  const rows = await prisma.transportProposal.findMany({ where: { fromId: userId }, orderBy: { createdAt: "desc" }, take: 30 });
  const offers = rows.length ? await prisma.transportOffer.findMany({ where: { id: { in: rows.map((r) => r.offerId) } } }) : [];
  const offerMap = new Map(offers.map((o) => [o.id, o]));
  const names = offers.length ? await prisma.user.findMany({ where: { id: { in: Array.from(new Set(offers.map((o) => o.transporterId))) } }, select: { id: true, name: true } }) : [];
  const nameMap = new Map(names.map((n) => [n.id, n.name]));

  return rows.map((r) => {
    const o = offerMap.get(r.offerId);
    return {
      id: r.id,
      offerId: r.offerId,
      transporterId: o?.transporterId ?? null,
      transporterName: o ? nameMap.get(o.transporterId) ?? "Transportador" : "Transportador",
      route: o ? `${place(o.fromText, o.fromRegionKey).regionName ?? o.fromText ?? "—"} → ${place(o.toText, o.toRegionKey).regionName ?? o.toText ?? "—"}` : "—",
      travelDate: o?.travelDate ?? null,
      message: r.message,
      status: r.status,
      responseNote: r.responseNote,
      createdAt: r.createdAt,
    };
  });
}
