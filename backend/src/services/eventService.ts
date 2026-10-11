import { EventKind, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const MANAGER_ROLES = ["ADMIN", "GOVERNO", "ONG"];

export function canManage(role?: string) {
  return MANAGER_ROLES.includes(role ?? "");
}

function clean(value: any, max = 500): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export interface EventFilters {
  kind?: string;
  area?: string;
  when?: string;
  q?: string;
}

export async function listEvents(userId: string, filters: EventFilters) {
  const now = new Date();
  const where: Prisma.EventWhereInput = {};
  const and: Prisma.EventWhereInput[] = [];

  if (filters.kind && (Object.values(EventKind) as string[]).includes(filters.kind)) {
    where.kind = filters.kind as EventKind;
  }
  if (filters.area) {
    and.push({ OR: [{ area: filters.area }, { area: null }, { area: "GERAL" }] });
  }
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { location: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.when === "past") {
    and.push({ startsAt: { lt: now } }, { OR: [{ endsAt: null }, { endsAt: { lt: now } }] });
  } else if (filters.when !== "all") {
    and.push({ OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] });
  }
  if (and.length) where.AND = and;

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: filters.when === "past" ? "desc" : "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  const mine = events.length
    ? await prisma.eventRegistration.findMany({
        where: { userId, eventId: { in: events.map((e) => e.id) } },
        select: { eventId: true },
      })
    : [];
  const registeredIds = new Set(mine.map((m) => m.eventId));

  return events.map((e) => ({
    ...e,
    registrations: e._count.registrations,
    registered: registeredIds.has(e.id),
  }));
}

export async function myEvents(userId: string) {
  const rows = await prisma.eventRegistration.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { event: { startsAt: "desc" } },
  });
  return rows.map((r) => ({ ...r.event, registered: true, registeredAt: r.createdAt }));
}

export async function getEvent(id: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) {
    throw new Error("Evento não encontrado.");
  }

  const mine = await prisma.eventRegistration.findFirst({ where: { eventId: id, userId } });
  return { ...event, registrations: event._count.registrations, registered: !!mine };
}

export async function createEvent(userId: string, role: string | undefined, input: any) {
  if (!canManage(role)) {
    throw new Error("Só organizadores autorizados podem criar eventos.");
  }

  const title = clean(input?.title, 150);
  const location = clean(input?.location, 200);
  if (!title || !location) {
    throw new Error("Informe o título e o local do evento.");
  }

  const kind = String(input.kind ?? "FEIRA");
  if (!(Object.values(EventKind) as string[]).includes(kind)) {
    throw new Error("Tipo de evento inválido.");
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (isNaN(startsAt.getTime()) || (endsAt && isNaN(endsAt.getTime()))) {
    throw new Error("Data inválida.");
  }
  if (endsAt && endsAt < startsAt) {
    throw new Error("A data final deve ser depois da inicial.");
  }

  return prisma.event.create({
    data: {
      createdById: userId,
      kind: kind as EventKind,
      title,
      description: clean(input.description, 1500),
      location,
      startsAt,
      endsAt,
      organizerName: clean(input.organizerName, 120),
      organizerContact: clean(input.organizerContact, 120),
      area: clean(input.area, 30),
    },
  });
}

export async function deleteEvent(userId: string, role: string | undefined, id: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    throw new Error("Evento não encontrado.");
  }
  if (event.createdById !== userId && role !== "ADMIN") {
    throw new Error("Você não tem permissão para apagar este evento.");
  }
  await prisma.event.delete({ where: { id } });
  return { id, deleted: true };
}

export async function toggleRegistration(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error("Evento não encontrado.");
  }

  const existing = await prisma.eventRegistration.findFirst({ where: { eventId, userId } });
  if (existing) {
    await prisma.eventRegistration.delete({ where: { id: existing.id } });
    return { registered: false };
  }

  const end = event.endsAt ?? event.startsAt;
  if (end.getTime() < Date.now()) {
    throw new Error("Este evento já terminou.");
  }

  await prisma.eventRegistration.create({ data: { eventId, userId } });
  return { registered: true };
}

export async function listRegistrations(userId: string, role: string | undefined, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error("Evento não encontrado.");
  }
  if (event.createdById !== userId && role !== "ADMIN") {
    throw new Error("Só o organizador vê a lista de inscritos.");
  }

  const rows = await prisma.eventRegistration.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
  const users = await usersByIds(rows.map((r) => r.userId));

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    user: users.get(r.userId) ?? null,
  }));
}
