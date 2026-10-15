import { SosKind, SosStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const RESCUE_ROLES = ["ADMIN", "GOVERNO"];
const ACTIVE: SosStatus[] = [SosStatus.ABERTO, SosStatus.EM_RESGATE];

const KIND_LABEL: Record<string, string> = {
  SOS: "SOS",
  MOTOR: "Problema no motor",
  BARCO_AVARIADO: "Barco avariado",
  COMBUSTIVEL: "Falta de combustível",
  HOMEM_AO_MAR: "Homem ao mar",
  MAU_TEMPO: "Mau tempo",
  OUTRO: "Outra emergência",
};

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function readCoords(input: any) {
  const hasLat = input?.lat !== undefined && input.lat !== null && input.lat !== "";
  const hasLng = input?.lng !== undefined && input.lng !== null && input.lng !== "";
  if (!hasLat && !hasLng) return { lat: null as number | null, lng: null as number | null };

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!hasLat || !hasLng || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordenadas inválidas.");
  }
  return { lat, lng };
}

function placeText(alert: { lat: number | null; lng: number | null; locationText: string | null }) {
  if (alert.locationText) return alert.locationText;
  if (alert.lat !== null && alert.lng !== null) return `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}`;
  return "localização não enviada";
}

async function notifyRescue(title: string, message: string, relatedId: string) {
  const users = await prisma.user.findMany({
    where: { role: { in: RESCUE_ROLES as any }, isActive: true },
    select: { id: true },
  });
  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "SISTEMA" as const,
      title,
      message,
      relatedId,
    })),
  });
}

function requireRescue(role?: string) {
  if (!RESCUE_ROLES.includes(role ?? "")) {
    throw new Error("Acesso restrito à equipa de resgate.");
  }
}

export async function createSos(userId: string, input: any) {
  const kind = String(input?.kind ?? "SOS");
  if (!(Object.values(SosKind) as string[]).includes(kind)) {
    throw new Error("Tipo de emergência inválido.");
  }

  const active = await prisma.sosAlert.findFirst({ where: { userId, status: { in: ACTIVE } } });
  if (active) {
    throw new Error("Você já tem um pedido de socorro ativo. Atualize a localização ou encerre-o primeiro.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const { lat, lng } = readCoords(input);
  const locationText = clean(input?.location, 150);

  const alert = await prisma.sosAlert.create({
    data: {
      userId,
      kind: kind as SosKind,
      message: clean(input?.message, 500),
      lat,
      lng,
      locationText,
      contactPhone: user.phone,
      locationUpdatedAt: lat !== null || locationText ? new Date() : null,
    },
  });

  await notifyRescue(
    "🆘 SOS no mar",
    `${user.name}${user.phone ? ` (${user.phone})` : ""} · ${KIND_LABEL[kind]} · ${placeText(alert)}`,
    alert.id
  );

  const contacts = await prisma.importantContact.findMany({
    where: { kind: { in: ["MAR", "SEGURANCA"] } },
    orderBy: { name: "asc" },
    take: 10,
  });

  return { alert, contacts };
}

export async function mySos(userId: string) {
  return prisma.sosAlert.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}

export async function updateLocation(userId: string, id: string, input: any) {
  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== userId) {
    throw new Error("Pedido de socorro não encontrado.");
  }
  if (!ACTIVE.includes(alert.status)) {
    throw new Error("Este pedido de socorro já foi encerrado.");
  }

  const { lat, lng } = readCoords(input);
  const locationText = clean(input?.location, 150);
  if (lat === null && !locationText) {
    throw new Error("Informe a sua localização.");
  }

  return prisma.sosAlert.update({
    where: { id },
    data: {
      lat: lat ?? alert.lat,
      lng: lng ?? alert.lng,
      locationText: locationText ?? alert.locationText,
      locationUpdatedAt: new Date(),
    },
  });
}

export async function closeOwn(userId: string, id: string, status: string) {
  if (status !== "RESOLVIDO" && status !== "CANCELADO") {
    throw new Error("Estado inválido.");
  }

  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== userId) {
    throw new Error("Pedido de socorro não encontrado.");
  }
  if (!ACTIVE.includes(alert.status)) {
    throw new Error("Este pedido de socorro já foi encerrado.");
  }

  const updated = await prisma.sosAlert.update({
    where: { id },
    data: { status: status as SosStatus, resolvedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notifyRescue(
    status === "RESOLVIDO" ? "SOS encerrado: está a salvo" : "SOS cancelado",
    `${user?.name ?? "Pescador"} encerrou o pedido de socorro (${KIND_LABEL[alert.kind]}).`,
    id
  );

  return updated;
}

export async function listActive(role: string | undefined, status?: string) {
  requireRescue(role);

  const where: any = {};
  if (status && (Object.values(SosStatus) as string[]).includes(status)) {
    where.status = status;
  } else {
    where.status = { in: ACTIVE };
  }

  const alerts = await prisma.sosAlert.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  const users = await usersByIds(alerts.map((a) => a.userId));

  return alerts.map((a) => ({
    ...a,
    minutesAgo: Math.floor((Date.now() - a.createdAt.getTime()) / 60000),
    user: users.get(a.userId) ?? null,
  }));
}

export async function setStatus(userId: string, role: string | undefined, id: string, status: string) {
  requireRescue(role);

  if (!["EM_RESGATE", "RESOLVIDO", "CANCELADO"].includes(status)) {
    throw new Error("Estado inválido.");
  }

  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert) {
    throw new Error("Pedido de socorro não encontrado.");
  }
  if (!ACTIVE.includes(alert.status)) {
    throw new Error("Este pedido de socorro já foi encerrado.");
  }

  const terminal = status !== "EM_RESGATE";
  const updated = await prisma.sosAlert.update({
    where: { id },
    data: {
      status: status as SosStatus,
      handledById: userId,
      resolvedAt: terminal ? new Date() : null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: alert.userId,
      type: "SISTEMA",
      title: status === "EM_RESGATE" ? "A equipa está a tratar do seu SOS" : "O seu pedido de socorro foi encerrado",
      message:
        status === "EM_RESGATE"
          ? "A equipa recebeu o seu pedido de socorro. Mantenha o telefone ligado e partilhe a sua localização."
          : "A equipa encerrou o seu pedido de socorro.",
      relatedId: id,
    },
  });

  return updated;
}
