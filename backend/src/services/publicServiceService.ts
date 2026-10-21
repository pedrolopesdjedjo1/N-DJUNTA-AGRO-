import { prisma } from "../lib/prisma";
import { SERVICE_CATEGORIES, SERVICE_STATUS } from "../lib/govCatalog";
import { values } from "../lib/ngoCatalog";
import { orgInfo } from "../lib/ngoOrgInfo";
import { assertGov } from "./organizationService";

const CATEGORY_VALUES = values(SERVICE_CATEGORIES);
const STATUS_VALUES = values(SERVICE_STATUS);
const MAX_SERVICES = 300;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function readPhone(value: any): string | null {
  const phone = clean(value, 20);
  if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
    throw new Error(`Telefone inválido: ${phone}`);
  }
  return phone;
}

function readEmail(value: any): string | null {
  const email = clean(value, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`E-mail inválido: ${email}`);
  }
  return email ? email.toLowerCase() : null;
}

function readWebsite(value: any): string | null {
  const raw = clean(value, 200);
  if (!raw) return null;
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) {
    throw new Error("Endereço do website inválido.");
  }
  return url;
}

function readCoords(input: any) {
  if (input?.lat === undefined && input?.lng === undefined) return undefined;
  const has = (v: any) => v !== undefined && v !== null && v !== "";
  if (!has(input?.lat) && !has(input?.lng)) return { lat: null as number | null, lng: null as number | null };

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!has(input.lat) || !has(input.lng) || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordenadas inválidas.");
  }
  return { lat, lng };
}

function readService(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.name !== undefined) {
    const name = clean(input?.name, 150);
    if (!name || name.length < 3) {
      throw new Error("Escreva o nome do serviço.");
    }
    data.name = name;
  }

  if (!existing || input?.category !== undefined) {
    if (!CATEGORY_VALUES.includes(String(input?.category))) {
      throw new Error("Escolha o tipo de serviço.");
    }
    data.category = String(input.category);
  }

  if (input?.description !== undefined) data.description = clean(input.description, 2000);

  if (Array.isArray(input?.requiredDocuments)) {
    data.requiredDocuments = input.requiredDocuments
      .map((d: any) => String(d).trim().slice(0, 150))
      .filter(Boolean)
      .slice(0, 20);
  }

  if (input?.howToRequest !== undefined) data.howToRequest = clean(input.howToRequest, 1500);
  if (input?.fee !== undefined) data.fee = clean(input.fee, 200);
  if (input?.processingTime !== undefined) data.processingTime = clean(input.processingTime, 100);
  if (input?.address !== undefined) data.address = clean(input.address, 200);
  if (input?.region !== undefined) data.region = clean(input.region, 80);
  if (input?.schedule !== undefined) data.schedule = clean(input.schedule, 300);
  if (input?.phone !== undefined) data.phone = readPhone(input.phone);
  if (input?.email !== undefined) data.email = readEmail(input.email);
  if (input?.website !== undefined) data.website = readWebsite(input.website);

  const coords = readCoords(input);
  if (coords) {
    data.lat = coords.lat;
    data.lng = coords.lng;
  }

  if (input?.status !== undefined) {
    if (!STATUS_VALUES.includes(String(input.status))) {
      throw new Error("Estado do serviço inválido.");
    }
    data.status = String(input.status);
  }
  if (input?.statusNote !== undefined) data.statusNote = clean(input.statusNote, 200);
  if (input?.isPublished !== undefined) data.isPublished = Boolean(input.isPublished);

  const region = data.region !== undefined ? data.region : existing?.region ?? null;
  const address = data.address !== undefined ? data.address : existing?.address ?? null;
  if (!region && !address) {
    throw new Error("Indique a região ou o endereço do serviço.");
  }

  return data;
}

async function shape(viewerId: string, items: any[]) {
  const orgs = await orgInfo(items.map((s) => s.ownerId));
  return items.map((s) => ({
    ...s,
    organization: orgs.get(s.ownerId) ?? null,
    isMine: s.ownerId === viewerId,
  }));
}

async function ownService(userId: string, role: string | undefined, id: string) {
  assertGov(role);
  const found = await prisma.publicService.findUnique({ where: { id } });
  if (!found || (found.ownerId !== userId && role !== "ADMIN")) {
    throw new Error("Serviço não encontrado.");
  }
  return found;
}

// ---------- Ver serviços (qualquer pessoa) ----------
export async function listServices(
  userId: string,
  filters: { category?: string; region?: string; q?: string; status?: string; ownerId?: string }
) {
  const where: any = { isPublished: true };
  if (filters.category && CATEGORY_VALUES.includes(filters.category)) where.category = filters.category;
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.region) {
    where.OR = [
      { region: { contains: filters.region, mode: "insensitive" } },
      { address: { contains: filters.region, mode: "insensitive" } },
    ];
  }
  if (filters.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
          { howToRequest: { contains: filters.q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const items = await prisma.publicService.findMany({ where, orderBy: { name: "asc" }, take: 200 });
  return { total: items.length, items: await shape(userId, items) };
}

export async function getService(userId: string, id: string) {
  const found = await prisma.publicService.findUnique({ where: { id } });
  if (!found || (!found.isPublished && found.ownerId !== userId)) {
    throw new Error("Serviço não encontrado.");
  }

  const [item] = await shape(userId, [found]);
  return item;
}

// ---------- Gerir (instituições públicas) ----------
export async function myServices(userId: string, role: string | undefined) {
  assertGov(role);
  const items = await prisma.publicService.findMany({ where: { ownerId: userId }, orderBy: { name: "asc" }, take: 300 });
  return shape(userId, items);
}

export async function createService(userId: string, role: string | undefined, input: any) {
  assertGov(role);

  const count = await prisma.publicService.count({ where: { ownerId: userId } });
  if (count >= MAX_SERVICES) {
    throw new Error(`Pode registar até ${MAX_SERVICES} serviços.`);
  }

  const data = readService(input);
  const created = await prisma.publicService.create({ data: { ownerId: userId, ...data } });
  const [item] = await shape(userId, [created]);
  return item;
}

export async function updateService(userId: string, role: string | undefined, id: string, input: any) {
  const found = await ownService(userId, role, id);
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do serviço o pode editar.");
  }

  const data = readService(input, found);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.publicService.update({ where: { id }, data });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function setServiceStatus(userId: string, role: string | undefined, id: string, input: any) {
  const found = await ownService(userId, role, id);
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do serviço lhe pode mudar o estado.");
  }

  const status = String(input?.status ?? "");
  if (!STATUS_VALUES.includes(status)) {
    throw new Error("Estado do serviço inválido.");
  }

  const note = clean(input?.note, 200);
  if ((status === "TEMPORARIO" || status === "ENCERRADO") && !note) {
    throw new Error("Escreva o motivo ou a data de regresso, para as pessoas perceberem.");
  }

  const updated = await prisma.publicService.update({
    where: { id },
    data: { status, statusNote: status === "DISPONIVEL" ? null : note },
  });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function deleteService(userId: string, role: string | undefined, id: string) {
  const found = await ownService(userId, role, id);
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do serviço o pode apagar.");
  }

  await prisma.publicService.delete({ where: { id } });
  return { id, deleted: true };
}
