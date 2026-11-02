import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { SERVICE_KINDS, SERVICE_STATUS, INCIDENT_KINDS, INCIDENT_STATUS } from "../lib/transportToolsCatalog";
import { PAYOUT_STATUS } from "../lib/transportBusinessCatalog";
import { readServicePoint, shapePoint } from "./transportToolsService";

const DAY = 86400000;
const PAGE_SIZE = 25;
const REGION_KEYS = REGIONS.map((r) => r.key);
const KIND_VALUES = values(SERVICE_KINDS);
const STATUS_VALUES = values(SERVICE_STATUS);
const INCIDENT_STATUS_VALUES = values(INCIDENT_STATUS);
const INCIDENT_KIND_VALUES = values(INCIDENT_KINDS);
const PAYOUT_STATUS_VALUES = values(PAYOUT_STATUS);

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

function mapsLink(lat: number | null, lng: number | null): string | null {
  return lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}

// Regista a decisão no registo de atividades da equipa
async function audit(adminId: string, action: string, targetType: string, targetId: string, summary: string, meta?: any) {
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
  await prisma.adminAudit.create({
    data: {
      adminId,
      adminName: admin?.name ?? "Administrador",
      action,
      targetType,
      targetId,
      summary: summary.slice(0, 300),
      meta: (meta ?? undefined) as any,
    },
  });
}

// =====================================================================
// Visão geral extra: o que o painel de transportes ainda não mostrava
// =====================================================================
export async function transportExtraOverview() {
  const [incidentsOpen, sosOpen, pendingPoints, contested, pendingPayouts] = await Promise.all([
    prisma.transporterIncident.count({ where: { status: { not: "RESOLVIDA" } } }),
    prisma.transporterIncident.count({ where: { kind: "SOS", status: { not: "RESOLVIDA" } } }),
    prisma.servicePoint.count({ where: { status: "PENDENTE" } }),
    prisma.transportPayout.aggregate({ where: { status: "CONTESTADO" }, _count: { _all: true }, _sum: { netAmount: true } }),
    prisma.transportPayout.findMany({ where: { status: "PENDENTE", createdAt: { lt: new Date(Date.now() - 3 * DAY) } }, select: { netAmount: true }, take: 5000 }),
  ]);

  return {
    incidents: { open: incidentsOpen, sosOpen },
    servicePoints: { pending: pendingPoints },
    payouts: {
      contested: contested._count._all,
      contestedValue: Math.round(contested._sum.netAmount ?? 0),
      overdue: pendingPayouts.length,
      overdueValue: Math.round(pendingPayouts.reduce((s, p) => s + p.netAmount, 0)),
    },
  };
}

// =====================================================================
// Postos de combustível, oficinas, estacionamentos e manutenção
// =====================================================================
export async function listPointsAdmin(filters: { status?: string; kind?: string; region?: string; q?: string; page?: number }) {
  const where: any = {};
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.region && REGION_KEYS.includes(filters.region)) where.regionKey = filters.region;

  const [rows, counts] = await Promise.all([
    prisma.servicePoint.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 600 }),
    prisma.servicePoint.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const needle = plain(filters.q);
  const filtered = needle ? rows.filter((s) => plain(`${s.name} ${s.address} ${s.phone}`).includes(needle)) : rows;

  const suggesterIds = Array.from(new Set(filtered.map((s) => s.suggestedBy).filter(Boolean))) as string[];
  const users = suggesterIds.length ? await prisma.user.findMany({ where: { id: { in: suggesterIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    total: filtered.length,
    page,
    pageSize: PAGE_SIZE,
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
      ...shapePoint(s, null),
      suggestedByName: s.suggestedBy ? names.get(s.suggestedBy) ?? "Transportador" : null,
      reviewNote: s.reviewNote,
      reviewedAt: s.reviewedAt,
      createdAt: s.createdAt,
    })),
  };
}

// A equipa cria um local já publicado
export async function createPointAdmin(adminId: string, input: any) {
  const data = readServicePoint(input);

  const dup = await prisma.servicePoint.findFirst({
    where: { kind: data.kind, regionKey: data.regionKey, name: { equals: data.name, mode: "insensitive" }, status: { not: "ESCONDIDO" } },
  });
  if (dup) {
    throw new Error("Este local já está na lista ou em análise.");
  }

  const created = await prisma.servicePoint.create({
    data: { ...data, status: "PUBLICADO", reviewedBy: adminId, reviewedAt: new Date() },
  });
  await audit(adminId, "SERVICE_POINT_SAVE", "SERVICE", created.id, `Criou o local "${created.name}" (${KIND_VALUES.includes(created.kind) ? created.kind : ""}).`);
  return shapePoint(created, null);
}

export async function updatePointAdmin(adminId: string, id: string, input: any) {
  const found = await prisma.servicePoint.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Local não encontrado.");
  }

  const data = readServicePoint(input);
  const updated = await prisma.servicePoint.update({ where: { id }, data });
  await audit(adminId, "SERVICE_POINT_SAVE", "SERVICE", id, `Editou o local "${updated.name}".`, {
    before: { name: found.name, address: found.address, phone: found.phone, hours: found.hours },
    after: { name: updated.name, address: updated.address, phone: updated.phone, hours: updated.hours },
  });
  return shapePoint(updated, null);
}

// Publicar uma sugestão ou esconder um local. Quem sugeriu recebe a resposta.
export async function reviewPointAdmin(adminId: string, id: string, input: any) {
  const found = await prisma.servicePoint.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Local não encontrado.");
  }

  const decision = String(input?.decision ?? "");
  if (decision !== "PUBLICAR" && decision !== "ESCONDER") {
    throw new Error("Escolha publicar ou esconder.");
  }
  const note = clean(input?.note, 200);
  if (decision === "ESCONDER" && (!note || note.length < 3)) {
    throw new Error("Explique porque o local é escondido. Quem o sugeriu vê.");
  }

  const updated = await prisma.servicePoint.update({
    where: { id },
    data: { status: decision === "PUBLICAR" ? "PUBLICADO" : "ESCONDIDO", reviewedBy: adminId, reviewNote: note, reviewedAt: new Date() },
  });

  if (found.suggestedBy && found.status === "PENDENTE") {
    await prisma.notification.create({
      data: {
        userId: found.suggestedBy,
        type: "SISTEMA",
        title: decision === "PUBLICAR" ? "O local que sugeriu foi publicado" : "O local que sugeriu não foi publicado",
        message: decision === "PUBLICAR" ? `"${found.name}" já aparece para todos os transportadores. Obrigado!` : `"${found.name}": ${note}`,
        relatedId: id,
      },
    });
  }

  await audit(adminId, "SERVICE_POINT_REVIEW", "SERVICE", id, `${decision === "PUBLICAR" ? "Publicou" : "Escondeu"} o local "${found.name}".${note ? ` ${note}` : ""}`);
  return shapePoint(updated, null);
}

export async function deletePointAdmin(adminId: string, id: string) {
  const found = await prisma.servicePoint.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Local não encontrado.");
  }

  await prisma.servicePoint.delete({ where: { id } });
  await audit(adminId, "SERVICE_POINT_DELETE", "SERVICE", id, `Apagou o local "${found.name}".`);
  return { id, deleted: true };
}

// =====================================================================
// Ocorrências dos transportadores: SOS, acidentes, avarias, assistência
// =====================================================================
function shapeIncident(i: any, transporter?: any) {
  return {
    id: i.id,
    kind: i.kind,
    kindLabel: INCIDENT_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind,
    description: i.description,
    status: i.status,
    locationShared: i.locationShared,
    lat: i.locationShared ? i.lat : null,
    lng: i.locationShared ? i.lng : null,
    mapUrl: i.locationShared ? mapsLink(i.lat, i.lng) : null,
    deliveryId: i.deliveryId,
    orderCode: null as string | null,
    adminNote: i.adminNote,
    handledBy: i.handledBy,
    resolvedAt: i.resolvedAt,
    createdAt: i.createdAt,
    ageMinutes: Math.floor((Date.now() - new Date(i.createdAt).getTime()) / 60000),
    transporter: transporter ? { id: transporter.id, name: transporter.name, phone: transporter.phone, location: transporter.location } : null,
  };
}

export async function listIncidentsAdmin(filters: { status?: string; kind?: string; page?: number }) {
  const where: any = {};
  if (filters.kind && INCIDENT_KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;

  const [all, counts] = await Promise.all([
    prisma.transporterIncident.findMany({ where, orderBy: { createdAt: "desc" }, take: 400 }),
    prisma.transporterIncident.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const wanted = filters.status ?? "open";
  let list = all;
  if (wanted === "open") list = all.filter((i) => i.status !== "RESOLVIDA");
  else if (INCIDENT_STATUS_VALUES.includes(wanted)) list = all.filter((i) => i.status === wanted);

  // O que está aberto vem primeiro, e o SOS à frente de tudo
  const rank = (i: any) => (i.status === "RESOLVIDA" ? 3 : i.kind === "SOS" ? 0 : i.kind === "ACIDENTE" ? 1 : 2);
  list = [...list].sort((a, b) => rank(a) - rank(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const ids = Array.from(new Set(list.map((i) => i.transporterId)));
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, location: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    openSos: all.filter((i) => i.kind === "SOS" && i.status !== "RESOLVIDA").length,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((i) => shapeIncident(i, userMap.get(i.transporterId))),
  };
}

export async function getIncidentAdmin(id: string) {
  const i = await prisma.transporterIncident.findUnique({ where: { id } });
  if (!i) {
    throw new Error("Ocorrência não encontrada.");
  }

  const [user, profile, delivery, handler, others] = await Promise.all([
    prisma.user.findUnique({ where: { id: i.transporterId }, select: { id: true, name: true, phone: true, location: true } }),
    prisma.transporterProfile.findUnique({ where: { userId: i.transporterId } }),
    i.deliveryId ? prisma.delivery.findUnique({ where: { id: i.deliveryId } }) : Promise.resolve(null),
    i.handledBy ? prisma.user.findUnique({ where: { id: i.handledBy }, select: { name: true } }) : Promise.resolve(null),
    prisma.transporterIncident.count({ where: { transporterId: i.transporterId, id: { not: id } } }),
  ]);

  const shaped = shapeIncident(i, user);
  shaped.orderCode = delivery ? shortId((delivery as any).orderId) : null;

  return {
    incident: shaped,
    handledByName: handler?.name ?? null,
    vehicle: profile
      ? { type: profile.vehicleType, plate: profile.plate, status: profile.vehicleStatus, capacityKg: profile.capacityKg }
      : null,
    // Só se mostram os contactos de emergência numa ocorrência que ainda precisa de ajuda
    emergencyContacts: i.status !== "RESOLVIDA" ? (((profile as any)?.emergencyContacts ?? []) as { name: string; phone: string }[]) : [],
    otherIncidents: others,
  };
}

export async function handleIncidentAdmin(adminId: string, id: string, input: any) {
  const i = await prisma.transporterIncident.findUnique({ where: { id } });
  if (!i) {
    throw new Error("Ocorrência não encontrada.");
  }
  if (i.status === "RESOLVIDA") {
    throw new Error("Esta ocorrência já está resolvida.");
  }

  const status = String(input?.status ?? "");
  if (status !== "EM_ATENDIMENTO" && status !== "RESOLVIDA") {
    throw new Error("Escolha o estado: em atendimento ou resolvida.");
  }
  const note = clean(input?.note, 300);
  if (status === "RESOLVIDA" && (!note || note.length < 3)) {
    throw new Error("Explique como o caso foi resolvido.");
  }

  const updated = await prisma.transporterIncident.update({
    where: { id },
    data: {
      status,
      adminNote: note ?? i.adminNote,
      handledBy: adminId,
      ...(status === "RESOLVIDA" ? { resolvedAt: new Date() } : {}),
    },
  });

  const label = INCIDENT_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind;
  await prisma.notification.create({
    data: {
      userId: i.transporterId,
      type: "SISTEMA",
      title: status === "RESOLVIDA" ? "A sua ocorrência foi resolvida" : "A equipa está a tratar da sua ocorrência",
      message: `${label}${note ? `: ${note}` : ""}`.slice(0, 300),
      relatedId: id,
    },
  });

  await audit(adminId, "INCIDENT_HANDLE", "INCIDENT", id, `${status === "RESOLVIDA" ? "Resolveu" : "Passou a atender"} a ocorrência (${label}).${note ? ` ${note}` : ""}`);

  const user = await prisma.user.findUnique({ where: { id: i.transporterId }, select: { id: true, name: true, phone: true, location: true } });
  return shapeIncident(updated, user);
}

// =====================================================================
// Pagamentos do transporte: o que a equipa acompanha e resolve
// =====================================================================
export async function listPayoutsAdmin(filters: { status?: string; transporterId?: string; page?: number }) {
  const where: any = {};
  if (filters.transporterId) where.transporterId = filters.transporterId;

  const all = await prisma.transportPayout.findMany({ where, orderBy: { createdAt: "desc" }, take: 1500 });
  const overdueLimit = Date.now() - 3 * DAY;

  const sum = (rows: any[]) => ({ count: rows.length, amount: Math.round(rows.reduce((s, p) => s + p.netAmount, 0)) });
  const summary = {
    pending: sum(all.filter((p) => p.status === "PENDENTE")),
    overdue: sum(all.filter((p) => p.status === "PENDENTE" && new Date(p.createdAt).getTime() < overdueLimit)),
    received: sum(all.filter((p) => p.status === "RECEBIDO")),
    contested: sum(all.filter((p) => p.status === "CONTESTADO")),
  };

  let list = all;
  if (filters.status === "OVERDUE") list = all.filter((p) => p.status === "PENDENTE" && new Date(p.createdAt).getTime() < overdueLimit);
  else if (filters.status && PAYOUT_STATUS_VALUES.includes(filters.status)) list = all.filter((p) => p.status === filters.status);
  else if (!filters.status) list = all.filter((p) => p.status === "CONTESTADO");

  const ids = Array.from(new Set(list.map((p) => p.transporterId)));
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    summary,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => ({
      id: p.id,
      deliveryId: p.deliveryId,
      orderId: p.orderId,
      orderCode: shortId(p.orderId),
      amount: p.amount,
      commissionAmount: p.commissionAmount,
      net: p.netAmount,
      status: p.status,
      method: p.method,
      reference: p.reference,
      note: p.note,
      receivedAt: p.receivedAt,
      createdAt: p.createdAt,
      ageDays: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / DAY),
      transporter: userMap.get(p.transporterId) ? { id: p.transporterId, name: userMap.get(p.transporterId)!.name, phone: userMap.get(p.transporterId)!.phone } : null,
    })),
  };
}

// Resolver um pagamento reclamado: confirmar que foi pago, ou voltar a pô-lo por receber
export async function resolvePayoutAdmin(adminId: string, id: string, input: any) {
  const p = await prisma.transportPayout.findUnique({ where: { id } });
  if (!p) {
    throw new Error("Pagamento não encontrado.");
  }
  if (p.status !== "CONTESTADO") {
    throw new Error("Só se resolvem pagamentos reclamados.");
  }

  const outcome = String(input?.outcome ?? "");
  if (outcome !== "RECEBIDO" && outcome !== "PENDENTE") {
    throw new Error("Escolha o resultado.");
  }
  const note = clean(input?.note, 300);
  if (!note || note.length < 5) {
    throw new Error("Explique o que foi apurado (pelo menos 5 letras). O transportador vê.");
  }

  const updated = await prisma.transportPayout.update({
    where: { id },
    data: { status: outcome, note, ...(outcome === "RECEBIDO" ? { receivedAt: new Date(), method: p.method ?? "OUTRO" } : {}) },
  });

  await prisma.notification.create({
    data: {
      userId: p.transporterId,
      type: "SISTEMA",
      title: outcome === "RECEBIDO" ? "Pagamento do transporte confirmado" : "Pagamento do transporte voltou a ficar por receber",
      message: `Encomenda ${shortId(p.orderId)} (${Math.round(p.netAmount)} FCFA): ${note}`.slice(0, 300),
      relatedId: p.deliveryId,
    },
  });

  await audit(adminId, "PAYOUT_RESOLVE", "PAYOUT", id, `Resolveu o pagamento da entrega ${shortId(p.orderId)}: ${outcome === "RECEBIDO" ? "confirmado como pago" : "voltou a ficar por receber"}. ${note}`, { before: p.status, after: outcome });

  return { id: updated.id, status: updated.status };
}
