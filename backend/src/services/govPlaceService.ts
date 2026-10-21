import { prisma } from "../lib/prisma";
import { PLACE_KINDS, PLACE_STATUS, PLACE_SUBTYPES } from "../lib/govCatalog";
import { values } from "../lib/ngoCatalog";
import { orgInfo } from "../lib/ngoOrgInfo";
import { assertGov } from "./organizationService";

const KIND_VALUES = values(PLACE_KINDS);
const STATUS_VALUES = values(PLACE_STATUS);
const MAX_PLACES = 1000;

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

function readPlace(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.kind !== undefined) {
    if (!KIND_VALUES.includes(String(input?.kind))) {
      throw new Error("Escolha o tipo de local (infraestrutura, mercado ou zona de produção).");
    }
    data.kind = String(input.kind);
  }

  const kind: string = data.kind ?? existing.kind;
  const kindChanged = !!existing && data.kind !== undefined && data.kind !== existing.kind;
  const subtype = input?.subtype !== undefined ? String(input.subtype) : kindChanged ? "" : existing?.subtype ?? "";
  if (!(PLACE_SUBTYPES[kind] ?? []).some((s) => s.value === subtype)) {
    throw new Error("Escolha o tipo específico deste local.");
  }
  if (!existing || input?.subtype !== undefined || kindChanged) data.subtype = subtype;

  if (!existing || input?.name !== undefined) {
    const name = clean(input?.name, 150);
    if (!name || name.length < 2) {
      throw new Error("Escreva o nome do local.");
    }
    data.name = name;
  }

  if (!existing || input?.region !== undefined) {
    const region = clean(input?.region, 80);
    if (!region) {
      throw new Error("Escreva a região do local.");
    }
    data.region = region;
  }

  if (input?.description !== undefined) data.description = clean(input.description, 1500);
  if (input?.address !== undefined) data.address = clean(input.address, 200);
  if (input?.schedule !== undefined) data.schedule = clean(input.schedule, 300);
  if (input?.phone !== undefined) data.phone = readPhone(input.phone);
  if (input?.capacity !== undefined) data.capacity = clean(input.capacity, 100);

  if (Array.isArray(input?.products)) {
    data.products = input.products
      .map((p: any) => String(p).trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 15);
  }

  const coords = readCoords(input);
  if (coords) {
    data.lat = coords.lat;
    data.lng = coords.lng;
  }

  if (input?.status !== undefined) {
    if (!STATUS_VALUES.includes(String(input.status))) {
      throw new Error("Estado do local inválido.");
    }
    data.status = String(input.status);
  }

  if (input?.isPublic !== undefined) data.isPublic = Boolean(input.isPublic);

  return data;
}

async function shape(viewerId: string, items: any[]) {
  const orgs = await orgInfo(items.map((p) => p.ownerId));
  return items.map((p) => ({
    ...p,
    organization: orgs.get(p.ownerId) ?? null,
    isMine: p.ownerId === viewerId,
  }));
}

async function ownPlace(userId: string, role: string | undefined, id: string) {
  assertGov(role);
  const found = await prisma.govPlace.findUnique({ where: { id } });
  if (!found || (found.ownerId !== userId && role !== "ADMIN")) {
    throw new Error("Local não encontrado.");
  }
  return found;
}

// ---------- Ver locais (qualquer pessoa) ----------
export async function listPlaces(
  userId: string,
  filters: { kind?: string; subtype?: string; region?: string; status?: string; q?: string; mine?: boolean }
) {
  const where: any = filters.mine ? { ownerId: userId } : { OR: [{ isPublic: true }, { ownerId: userId }] };
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.subtype) where.subtype = filters.subtype;
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const items = await prisma.govPlace.findMany({ where, orderBy: [{ region: "asc" }, { name: "asc" }], take: 500 });

  const byKind: Record<string, number> = {};
  items.forEach((p) => (byKind[p.kind] = (byKind[p.kind] ?? 0) + 1));

  return {
    total: items.length,
    summary: {
      byKind,
      damaged: items.filter((p) => p.status === "DANIFICADA").length,
      operational: items.filter((p) => p.status === "OPERACIONAL").length,
    },
    items: await shape(userId, items),
  };
}

export async function getPlace(userId: string, id: string) {
  const found = await prisma.govPlace.findUnique({ where: { id } });
  if (!found || (!found.isPublic && found.ownerId !== userId)) {
    throw new Error("Local não encontrado.");
  }

  const [item] = await shape(userId, [found]);
  return item;
}

// ---------- Gerir (instituições públicas) ----------
export async function createPlace(userId: string, role: string | undefined, input: any) {
  assertGov(role);

  const count = await prisma.govPlace.count({ where: { ownerId: userId } });
  if (count >= MAX_PLACES) {
    throw new Error(`Pode registar até ${MAX_PLACES} locais.`);
  }

  const data = readPlace(input);
  const created = await prisma.govPlace.create({ data: { ownerId: userId, ...data } });
  const [item] = await shape(userId, [created]);
  return item;
}

export async function updatePlace(userId: string, role: string | undefined, id: string, input: any) {
  const found = await ownPlace(userId, role, id);
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do local o pode editar.");
  }

  const data = readPlace(input, found);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.govPlace.update({ where: { id }, data });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function setPlaceStatus(userId: string, role: string | undefined, id: string, status: any) {
  const found = await ownPlace(userId, role, id);
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do local lhe pode mudar o estado.");
  }
  if (!STATUS_VALUES.includes(String(status))) {
    throw new Error("Estado do local inválido.");
  }

  const updated = await prisma.govPlace.update({ where: { id }, data: { status: String(status) } });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function deletePlace(userId: string, role: string | undefined, id: string) {
  const found = await ownPlace(userId, role, id);
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do local o pode apagar.");
  }

  await prisma.govPlace.delete({ where: { id } });
  return { id, deleted: true };
}
