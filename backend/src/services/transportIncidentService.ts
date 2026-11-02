import { prisma } from "../lib/prisma";
import { clean } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { INCIDENT_KINDS } from "../lib/transportToolsCatalog";
import { nearestRegion } from "../lib/ngoRegions";
import { loadAdmin } from "./adminAccess";
import { assertTransporter, ensureProfile } from "./transporterService";
import { validMe } from "./transportDeliveryService";
import { deliveryPhase } from "../lib/transportCatalog";

const HOUR = 3600000;
const DAY = 86400000;
const KIND_VALUES = values(INCIDENT_KINDS);

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

async function adminIdsWith(perm: string): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const snaps = await Promise.all(admins.map((a) => loadAdmin(a.id)));
  return snaps.filter((s) => s && s.status === "ATIVO" && s.permissions.has(perm)).map((s) => (s as any).userId as string);
}

function mapsLink(lat: number | null, lng: number | null): string | null {
  return lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}

function shape(i: any) {
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
    adminNote: i.adminNote,
    createdAt: i.createdAt,
    resolvedAt: i.resolvedAt,
  };
}

// =====================================================================
// Contactos de emergência do transportador (pessoas de confiança)
// =====================================================================
export async function getEmergencyContacts(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  return { contacts: ((profile as any).emergencyContacts ?? []) as { name: string; phone: string }[] };
}

export async function saveEmergencyContacts(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  await ensureProfile(userId);

  if (!Array.isArray(input?.contacts)) {
    throw new Error("Envie a lista de contactos.");
  }
  if (input.contacts.length > 5) {
    throw new Error("Pode guardar até 5 contactos de emergência.");
  }

  const contacts = input.contacts.map((c: any) => {
    const name = clean(c?.name, 60);
    const phone = clean(c?.phone, 20)?.replace(/[\s-]/g, "") ?? "";
    if (!name || name.length < 2) throw new Error("Escreva o nome de cada contacto.");
    if (!/^\+?\d{7,15}$/.test(phone)) throw new Error(`Telefone inválido: ${c?.phone}`);
    return { name, phone };
  });

  await prisma.transporterProfile.update({ where: { userId }, data: { emergencyContacts: contacts as any } });
  return { contacts };
}

// =====================================================================
// SOS, acidentes, avarias, pedidos de assistência e ocorrências
// =====================================================================
export async function createIncident(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const kind = String(input?.kind ?? "");
  if (!KIND_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de ocorrência.");
  }

  const description = clean(input?.description, 500);
  if (kind !== "SOS" && (!description || description.length < 5)) {
    throw new Error("Descreva o que se passou (pelo menos 5 letras).");
  }

  // Limites, para o SOS não ser usado em excesso
  const since = new Date(Date.now() - (kind === "SOS" ? HOUR : DAY));
  const recent = await prisma.transporterIncident.count({ where: { transporterId: userId, kind, createdAt: { gte: since } } });
  if (recent >= (kind === "SOS" ? 5 : 10)) {
    throw new Error(kind === "SOS" ? "Já enviou vários SOS na última hora. A equipa já foi avisada." : "Já registou muitas ocorrências hoje.");
  }

  // A localização só vai se o transportador autorizar, e se existir
  const wantsShare = input?.shareLocation === true;
  const point = wantsShare ? validMe(input?.lat, input?.lng) : null;

  let deliveryId: string | null = null;
  let delivery: any = null;
  if (input?.deliveryId) {
    delivery = await prisma.delivery.findUnique({ where: { id: String(input.deliveryId) } });
    if (!delivery || delivery.transporterId !== userId || !["ACEITE", "EM_TRANSPORTE"].includes(deliveryPhase(delivery))) {
      throw new Error("Entrega inválida.");
    }
    deliveryId = delivery.id;
  }

  const created = await prisma.transporterIncident.create({
    data: { transporterId: userId, kind, description, lat: point?.lat ?? null, lng: point?.lng ?? null, locationShared: !!point, deliveryId },
  });

  // A avaria pode pôr o veículo como indisponível, se o transportador quiser
  if (kind === "AVARIA" && input?.markVehicleBroken === true) {
    await prisma.transporterProfile.update({ where: { userId }, data: { vehicleStatus: "AVARIADO", vehicleStatusNote: description, isAvailable: false } });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
  const label = INCIDENT_KINDS.find((k) => k.value === kind)?.label ?? kind;
  const region = point ? nearestRegion(point.lat, point.lng)?.name : null;
  const link = mapsLink(point?.lat ?? null, point?.lng ?? null);

  // A equipa de transportes é avisada logo
  const admins = await adminIdsWith("transport.manage");
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((adminId) => ({
        userId: adminId,
        type: "SISTEMA" as const,
        title: kind === "SOS" ? "🚨 SOS de um transportador" : `Ocorrência de transportador: ${label}`,
        message: `${user?.name ?? "Transportador"}${user?.phone ? ` (${user.phone})` : ""}${region ? `, perto de ${region}` : ""}${description ? `: ${description}` : ""}${link ? ` ${link}` : ""}`.slice(0, 300),
        relatedId: created.id,
      })),
    });
  }

  // Acidente ou avaria a meio de uma entrega: fica no histórico dela e o comprador e o vendedor são avisados
  if (delivery && (kind === "ACIDENTE" || kind === "AVARIA")) {
    await prisma.deliveryEvent.create({
      data: { deliveryId: delivery.id, actorId: userId, kind: "PROBLEMA", category: "VEICULO", message: `${label}. ${description ?? ""}`.trim().slice(0, 500) },
    });

    const order: any = delivery.orderId ? await prisma.order.findUnique({ where: { id: delivery.orderId }, select: { id: true, buyerId: true, sellerId: true } }) : null;
    if (order) {
      await prisma.notification.createMany({
        data: [order.buyerId, order.sellerId].filter(Boolean).map((id: string) => ({
          userId: id,
          type: "SISTEMA" as const,
          title: "Problema na entrega",
          message: `O transportador teve um problema (${label.toLowerCase()}) na encomenda ${shortId(order.id)}. Pode haver atraso.`,
          relatedId: delivery.id,
        })),
      });
    }
  }

  const contacts = ((profile as any).emergencyContacts ?? []) as { name: string; phone: string }[];
  return {
    incident: shape(created),
    contacts,
    shareText: `${kind === "SOS" ? "SOS! Preciso de ajuda." : `${label}.`} ${user?.name ?? ""}${description ? `: ${description}` : ""}${link ? ` Localização: ${link}` : ""}`.trim(),
  };
}

export async function listMyIncidents(userId: string, role: string | undefined) {
  assertTransporter(role);
  const rows = await prisma.transporterIncident.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" }, take: 50 });
  return { open: rows.filter((r) => r.status !== "RESOLVIDA").length, items: rows.map(shape) };
}

export async function getMyIncident(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);
  const i = await prisma.transporterIncident.findUnique({ where: { id } });
  if (!i || i.transporterId !== userId) {
    throw new Error("Ocorrência não encontrada.");
  }
  return shape(i);
}

// O transportador pode fechar a sua ocorrência (por exemplo, se já está bem ou foi alarme falso)
export async function resolveMyIncident(userId: string, role: string | undefined, id: string, input: any) {
  assertTransporter(role);

  const i = await prisma.transporterIncident.findUnique({ where: { id } });
  if (!i || i.transporterId !== userId) {
    throw new Error("Ocorrência não encontrada.");
  }
  if (i.status === "RESOLVIDA") {
    throw new Error("Esta ocorrência já está resolvida.");
  }

  const note = clean(input?.message, 200);
  const updated = await prisma.transporterIncident.update({
    where: { id },
    data: { status: "RESOLVIDA", resolvedAt: new Date(), adminNote: i.adminNote ?? (note ? `O transportador fechou: ${note}` : "Fechada pelo transportador") },
  });

  const admins = await adminIdsWith("transport.manage");
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((adminId) => ({
        userId: adminId,
        type: "SISTEMA" as const,
        title: "Ocorrência fechada pelo transportador",
        message: `${INCIDENT_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind}${note ? `: ${note}` : ""}`.slice(0, 300),
        relatedId: id,
      })),
    });
  }
  return shape(updated);
}
