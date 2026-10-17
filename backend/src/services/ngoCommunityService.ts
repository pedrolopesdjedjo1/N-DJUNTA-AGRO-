import { prisma } from "../lib/prisma";
import {
  COMMUNITY_TYPES,
  GENDERS,
  NEED_CATEGORIES,
  NEED_PRIORITY,
  NEED_STATUS,
  SECTORS,
  values,
} from "../lib/ngoCatalog";
import { assertNgo } from "./organizationService";
import { listOrganizations } from "./ngoDirectoryService";

const TYPE_VALUES = values(COMMUNITY_TYPES);
const GENDER_VALUES = values(GENDERS);
const CATEGORY_VALUES = values(NEED_CATEGORIES);
const PRIORITY_VALUES = values(NEED_PRIORITY);
const NEED_STATUS_VALUES = values(NEED_STATUS);
const SECTOR_VALUES = values(SECTORS);

const MAX_COMMUNITIES = 300;
const MAX_BULK = 50;
const ROLE_SECTOR: Record<string, string> = { AGRICULTOR: "AGRICULTURA", PESCADOR: "PESCA", ARTESAO: "ARTESANATO" };
const DISCOVER_ROLE: Record<string, string> = { AGRICULTORES: "AGRICULTOR", PESCADORES: "PESCADOR", ARTESAOS: "ARTESAO" };

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readInt(value: any, label: string, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Math.floor(Number(value));
  if (isNaN(n) || n < min || n > max) {
    throw new Error(`${label} inválido.`);
  }
  return n;
}

function readCoords(input: any) {
  const has = (v: any) => v !== undefined && v !== null && v !== "";
  if (input?.lat === undefined && input?.lng === undefined) return undefined;
  if (!has(input?.lat) && !has(input?.lng)) return { lat: null as number | null, lng: null as number | null };

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!has(input.lat) || !has(input.lng) || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordenadas inválidas.");
  }
  return { lat, lng };
}

function readPhone(value: any): string | null {
  const phone = clean(value, 20);
  if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
    throw new Error(`Telefone inválido: ${phone}`);
  }
  return phone;
}

export function isYouth(birthYear?: number | null): boolean {
  if (!birthYear) return false;
  const year = new Date().getFullYear();
  return birthYear >= year - 35 && birthYear <= year - 15;
}

// Uma pessoa apoiada em vários projetos conta uma só vez
export function distinctBeneficiaries<
  T extends { userId: string | null; phone: string | null; name: string; communityId: string | null; region: string | null }
>(list: T[]): T[] {
  const seen = new Map<string, T>();
  list.forEach((b) => {
    const key = b.userId
      ? `u:${b.userId}`
      : b.phone
      ? `p:${b.phone.replace(/\D/g, "")}`
      : `n:${plain(b.name)}|${b.communityId ?? plain(b.region)}`;
    if (!seen.has(key)) seen.set(key, b);
  });
  return Array.from(seen.values());
}

async function ownCommunity(userId: string, id: string) {
  const community = await prisma.ngoCommunity.findUnique({ where: { id } });
  if (!community || community.ownerId !== userId) {
    throw new Error("Comunidade não encontrada.");
  }
  return community;
}

async function ownProject(userId: string, id: string) {
  const project = await prisma.ngoProject.findUnique({ where: { id } });
  if (!project || project.ownerId !== userId) {
    throw new Error("Projeto não encontrado.");
  }
  return project;
}

// ---------- Comunidades ----------
export async function listCommunities(
  userId: string,
  role: string | undefined,
  filters: { type?: string; region?: string; q?: string }
) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.type && TYPE_VALUES.includes(filters.type)) where.type = filters.type;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.q) where.name = { contains: filters.q, mode: "insensitive" };

  const communities = await prisma.ngoCommunity.findMany({ where, orderBy: { name: "asc" }, take: 300 });
  const ids = communities.map((c) => c.id);

  const [bens, needs] =
    ids.length > 0
      ? await Promise.all([
          prisma.ngoBeneficiary.groupBy({ by: ["communityId"], where: { communityId: { in: ids } }, _count: { _all: true } }),
          prisma.ngoNeed.groupBy({
            by: ["communityId"],
            where: { communityId: { in: ids }, status: { not: "ATENDIDA" } },
            _count: { _all: true },
          }),
        ])
      : [[], []];

  const benMap = new Map<string, number>();
  (bens as any[]).forEach((b) => b.communityId && benMap.set(b.communityId, b._count._all));
  const needMap = new Map<string, number>();
  (needs as any[]).forEach((n) => n.communityId && needMap.set(n.communityId, n._count._all));

  return communities.map((c) => ({ ...c, beneficiaries: benMap.get(c.id) ?? 0, openNeeds: needMap.get(c.id) ?? 0 }));
}

export async function createCommunity(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const name = clean(input?.name, 100);
  if (!name || name.length < 2) {
    throw new Error("Escreva o nome da comunidade.");
  }
  const region = clean(input?.region, 80);
  if (!region) {
    throw new Error("Escreva a região da comunidade.");
  }

  const type = String(input?.type ?? "RURAL");
  if (!TYPE_VALUES.includes(type)) {
    throw new Error("Tipo de comunidade inválido.");
  }

  const count = await prisma.ngoCommunity.count({ where: { ownerId: userId } });
  if (count >= MAX_COMMUNITIES) {
    throw new Error(`Pode registar até ${MAX_COMMUNITIES} comunidades.`);
  }

  const same = await prisma.ngoCommunity.findFirst({
    where: { ownerId: userId, name: { equals: name, mode: "insensitive" }, region: { equals: region, mode: "insensitive" } },
  });
  if (same) {
    throw new Error("Já registou esta comunidade nesta região.");
  }

  const coords = readCoords(input);
  const population = readInt(input?.population, "População", 0, 100000000);

  return prisma.ngoCommunity.create({
    data: {
      ownerId: userId,
      name,
      region,
      type,
      population: population ?? null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      description: clean(input?.description, 500),
    },
  });
}

export async function updateCommunity(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  await ownCommunity(userId, id);

  const data: any = {};
  if (input?.name !== undefined) {
    const name = clean(input.name, 100);
    if (!name || name.length < 2) {
      throw new Error("Escreva o nome da comunidade.");
    }
    data.name = name;
  }
  if (input?.region !== undefined) {
    const region = clean(input.region, 80);
    if (!region) {
      throw new Error("Escreva a região da comunidade.");
    }
    data.region = region;
  }
  if (input?.type !== undefined) {
    if (!TYPE_VALUES.includes(String(input.type))) {
      throw new Error("Tipo de comunidade inválido.");
    }
    data.type = String(input.type);
  }
  const population = readInt(input?.population, "População", 0, 100000000);
  if (population !== undefined) data.population = population;
  const coords = readCoords(input);
  if (coords) {
    data.lat = coords.lat;
    data.lng = coords.lng;
  }
  if (input?.description !== undefined) data.description = clean(input.description, 500);

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  return prisma.ngoCommunity.update({ where: { id }, data });
}

export async function deleteCommunity(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  await ownCommunity(userId, id);
  await prisma.ngoCommunity.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Necessidades ----------
export async function listNeeds(
  userId: string,
  role: string | undefined,
  filters: { communityId?: string; category?: string; status?: string; priority?: string; region?: string }
) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.communityId) where.communityId = filters.communityId;
  if (filters.category && CATEGORY_VALUES.includes(filters.category)) where.category = filters.category;
  if (filters.status && NEED_STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.priority && PRIORITY_VALUES.includes(filters.priority)) where.priority = filters.priority;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };

  const needs = await prisma.ngoNeed.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 });

  const communityIds = Array.from(new Set(needs.map((n) => n.communityId).filter(Boolean))) as string[];
  const communities = communityIds.length
    ? await prisma.ngoCommunity.findMany({ where: { id: { in: communityIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(communities.map((c) => [c.id, c.name]));

  const order: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
  return needs
    .map((n) => ({ ...n, communityName: n.communityId ? names.get(n.communityId) ?? null : null }))
    .sort(
      (a, b) =>
        Number(a.status === "ATENDIDA") - Number(b.status === "ATENDIDA") ||
        (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
    );
}

export async function createNeed(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  let region = clean(input?.region, 80);
  let communityId: string | null = null;

  if (input?.communityId) {
    const community = await ownCommunity(userId, String(input.communityId));
    communityId = community.id;
    region = region ?? community.region;
  }
  if (!communityId && !region) {
    throw new Error("Escolha a comunidade ou escreva a região.");
  }

  const category = String(input?.category ?? "");
  if (!CATEGORY_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de necessidade.");
  }

  const description = clean(input?.description, 500);
  if (!description || description.length < 3) {
    throw new Error("Descreva a necessidade.");
  }

  const priority = String(input?.priority ?? "MEDIA");
  if (!PRIORITY_VALUES.includes(priority)) {
    throw new Error("Prioridade inválida.");
  }

  const people = readInt(input?.peopleAffected, "Número de pessoas", 0, 100000000);
  let projectId: string | null = null;
  if (input?.projectId) projectId = (await ownProject(userId, String(input.projectId))).id;

  return prisma.ngoNeed.create({
    data: { ownerId: userId, communityId, projectId, region, category, description, priority, peopleAffected: people ?? null },
  });
}

export async function updateNeed(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  const need = await prisma.ngoNeed.findUnique({ where: { id } });
  if (!need || need.ownerId !== userId) {
    throw new Error("Necessidade não encontrada.");
  }

  const data: any = {};
  if (input?.description !== undefined) {
    const description = clean(input.description, 500);
    if (!description || description.length < 3) {
      throw new Error("Descreva a necessidade.");
    }
    data.description = description;
  }
  if (input?.category !== undefined) {
    if (!CATEGORY_VALUES.includes(String(input.category))) {
      throw new Error("Tipo de necessidade inválido.");
    }
    data.category = String(input.category);
  }
  if (input?.priority !== undefined) {
    if (!PRIORITY_VALUES.includes(String(input.priority))) {
      throw new Error("Prioridade inválida.");
    }
    data.priority = String(input.priority);
  }
  if (input?.status !== undefined) {
    if (!NEED_STATUS_VALUES.includes(String(input.status))) {
      throw new Error("Estado inválido.");
    }
    data.status = String(input.status);
  }
  const people = readInt(input?.peopleAffected, "Número de pessoas", 0, 100000000);
  if (people !== undefined) data.peopleAffected = people;
  if (input?.projectId !== undefined) {
    data.projectId = input.projectId ? (await ownProject(userId, String(input.projectId))).id : null;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  return prisma.ngoNeed.update({ where: { id }, data });
}

export async function deleteNeed(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const need = await prisma.ngoNeed.findUnique({ where: { id } });
  if (!need || need.ownerId !== userId) {
    throw new Error("Necessidade não encontrada.");
  }
  await prisma.ngoNeed.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Beneficiários ----------
async function readBeneficiary(userId: string, input: any, existing?: any) {
  const data: any = {};
  let linked: any = null;

  if (input?.userId) {
    linked = await prisma.user.findUnique({
      where: { id: String(input.userId) },
      select: { id: true, name: true, role: true, location: true },
    });
    if (!linked) {
      throw new Error("Pessoa do app não encontrada.");
    }
    data.userId = linked.id;
  } else if (input?.userId === null) {
    data.userId = null;
  }

  if (!existing || input?.name !== undefined) {
    const name = clean(input?.name, 120) ?? (linked ? linked.name : null);
    if (!name || name.length < 2) {
      throw new Error("Escreva o nome do beneficiário.");
    }
    data.name = name;
  }

  if (input?.phone !== undefined) data.phone = readPhone(input.phone);

  if (input?.gender !== undefined) {
    const gender = input.gender ? String(input.gender) : null;
    if (gender && !GENDER_VALUES.includes(gender)) {
      throw new Error("Género inválido.");
    }
    data.gender = gender;
  }

  const birthYear = readInt(input?.birthYear, "Ano de nascimento", 1900, new Date().getFullYear());
  if (birthYear !== undefined) data.birthYear = birthYear;

  if (input?.sector !== undefined || !existing) {
    const sector = input?.sector ? String(input.sector) : linked ? ROLE_SECTOR[linked.role] ?? "OUTRO" : "OUTRO";
    if (!SECTOR_VALUES.includes(sector)) {
      throw new Error("Sector inválido.");
    }
    data.sector = sector;
  }

  if (input?.projectId !== undefined) {
    data.projectId = input.projectId ? (await ownProject(userId, String(input.projectId))).id : null;
  }

  let community: any = null;
  if (input?.communityId !== undefined) {
    if (input.communityId) {
      community = await ownCommunity(userId, String(input.communityId));
      data.communityId = community.id;
    } else {
      data.communityId = null;
    }
  }

  if (input?.region !== undefined) {
    data.region = clean(input.region, 80);
  } else if (!existing) {
    data.region = community?.region ?? linked?.location ?? null;
  }

  if (input?.supportGiven !== undefined) data.supportGiven = clean(input.supportGiven, 300);
  if (input?.notes !== undefined) data.notes = clean(input.notes, 500);

  return { data, linked };
}

export async function createBeneficiary(userId: string, role: string | undefined, input: any) {
  assertNgo(role);
  const { data, linked } = await readBeneficiary(userId, input);

  if (data.projectId) {
    const duplicate = await prisma.ngoBeneficiary.findFirst({
      where: {
        ownerId: userId,
        projectId: data.projectId,
        OR: [
          ...(data.userId ? [{ userId: data.userId }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });
    if ((data.userId || data.phone) && duplicate) {
      throw new Error("Esta pessoa já está registada neste projeto.");
    }
  }

  const created = await prisma.ngoBeneficiary.create({ data: { ownerId: userId, ...data } });

  if (linked && linked.id !== userId) {
    const [org, project] = await Promise.all([
      prisma.organization.findUnique({ where: { ownerId: userId }, select: { name: true } }),
      data.projectId ? prisma.ngoProject.findUnique({ where: { id: data.projectId }, select: { name: true } }) : null,
    ]);
    await prisma.notification.create({
      data: {
        userId: linked.id,
        type: "SISTEMA",
        title: "Foi registado como beneficiário",
        message: `${org?.name ?? "Uma organização"} registou-o como beneficiário${project ? ` do projeto ${project.name}` : ""}.`,
        relatedId: created.id,
      },
    });
  }

  return created;
}

export async function createBeneficiaries(userId: string, role: string | undefined, input: any) {
  assertNgo(role);
  const items = Array.isArray(input?.items) ? input.items : [];
  if (items.length === 0) {
    throw new Error("Envie pelo menos um beneficiário.");
  }
  if (items.length > MAX_BULK) {
    throw new Error(`Envie até ${MAX_BULK} beneficiários de cada vez.`);
  }

  const shared = { projectId: input.projectId, communityId: input.communityId, sector: input.sector, region: input.region };
  let created = 0;
  const errors: { index: number; name: string | null; error: string }[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index] ?? {};
    try {
      await createBeneficiary(userId, role, {
        ...Object.fromEntries(Object.entries(shared).filter(([, v]) => v !== undefined && v !== "")),
        ...item,
      });
      created += 1;
    } catch (e: any) {
      errors.push({ index, name: clean(item?.name, 120), error: e.message });
    }
  }

  return { created, failed: errors.length, errors };
}

export async function listBeneficiaries(
  userId: string,
  role: string | undefined,
  filters: {
    projectId?: string;
    communityId?: string;
    sector?: string;
    gender?: string;
    youth?: boolean;
    linked?: boolean;
    q?: string;
    page?: number;
    limit?: number;
  }
) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.communityId) where.communityId = filters.communityId;
  if (filters.sector && SECTOR_VALUES.includes(filters.sector)) where.sector = filters.sector;
  if (filters.gender && GENDER_VALUES.includes(filters.gender)) where.gender = filters.gender;
  if (filters.linked) where.userId = { not: null };
  if (filters.youth) {
    const year = new Date().getFullYear();
    where.birthYear = { gte: year - 35, lte: year - 15 };
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { phone: { contains: filters.q } },
    ];
  }

  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 50)));
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  const [total, items] = await Promise.all([
    prisma.ngoBeneficiary.count({ where }),
    prisma.ngoBeneficiary.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);

  const projectIds = Array.from(new Set(items.map((b) => b.projectId).filter(Boolean))) as string[];
  const communityIds = Array.from(new Set(items.map((b) => b.communityId).filter(Boolean))) as string[];
  const [projects, communities] = await Promise.all([
    projectIds.length ? prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }) : [],
    communityIds.length ? prisma.ngoCommunity.findMany({ where: { id: { in: communityIds } }, select: { id: true, name: true } }) : [],
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const communityNames = new Map(communities.map((c) => [c.id, c.name]));

  return {
    total,
    page,
    limit,
    items: items.map((b) => ({
      ...b,
      isYouth: isYouth(b.birthYear),
      projectName: b.projectId ? projectNames.get(b.projectId) ?? null : null,
      communityName: b.communityId ? communityNames.get(b.communityId) ?? null : null,
    })),
  };
}

export async function updateBeneficiary(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  const found = await prisma.ngoBeneficiary.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Beneficiário não encontrado.");
  }

  const { data } = await readBeneficiary(userId, input, found);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  return prisma.ngoBeneficiary.update({ where: { id }, data });
}

export async function deleteBeneficiary(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const found = await prisma.ngoBeneficiary.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Beneficiário não encontrado.");
  }
  await prisma.ngoBeneficiary.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Apoio às comunidades: visão geral ----------
export async function getSupportOverview(userId: string, role: string | undefined) {
  assertNgo(role);

  const [rows, communities, needs] = await Promise.all([
    prisma.ngoBeneficiary.findMany({
      where: { ownerId: userId },
      select: { userId: true, phone: true, name: true, communityId: true, region: true, sector: true, gender: true, birthYear: true },
    }),
    prisma.ngoCommunity.findMany({ where: { ownerId: userId }, select: { type: true } }),
    prisma.ngoNeed.findMany({ where: { ownerId: userId }, select: { priority: true, status: true, category: true } }),
  ]);

  const people = distinctBeneficiaries(rows);
  const open = needs.filter((n) => n.status !== "ATENDIDA");

  const byCategory = new Map<string, number>();
  open.forEach((n) => byCategory.set(n.category, (byCategory.get(n.category) ?? 0) + 1));

  return {
    beneficiaries: people.length,
    registrations: rows.length,
    segments: {
      farmers: people.filter((p) => p.sector === "AGRICULTURA").length,
      fishers: people.filter((p) => p.sector === "PESCA").length,
      artisans: people.filter((p) => p.sector === "ARTESANATO").length,
      cooperatives: people.filter((p) => p.sector === "COOPERATIVA").length,
      youth: people.filter((p) => isYouth(p.birthYear)).length,
      women: people.filter((p) => p.gender === "F").length,
    },
    communities: {
      total: communities.length,
      rural: communities.filter((c) => c.type === "RURAL").length,
      coastal: communities.filter((c) => c.type === "COSTEIRA" || c.type === "ILHA").length,
      urban: communities.filter((c) => c.type === "URBANA").length,
    },
    needs: {
      open: open.length,
      urgent: open.filter((n) => n.priority === "URGENTE").length,
      high: open.filter((n) => n.priority === "ALTA").length,
      served: needs.length - open.length,
      byCategory: Array.from(byCategory.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

// ---------- Procurar pessoas e organizações no app ----------
export async function discover(
  userId: string,
  role: string | undefined,
  filters: { kind?: string; region?: string; q?: string; page?: number }
) {
  assertNgo(role);

  const kind = String(filters.kind ?? "AGRICULTORES");
  const limit = 40;
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  if (kind === "COOPERATIVAS") {
    const where: any = {};
    if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
    if (filters.q) where.name = { contains: filters.q, mode: "insensitive" };

    const [total, coops] = await Promise.all([
      prisma.cooperative.count({ where }),
      prisma.cooperative.findMany({
        where,
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const leaders = coops.length
      ? await prisma.user.findMany({ where: { id: { in: coops.map((c) => c.leaderId) } }, select: { id: true, name: true } })
      : [];
    const leaderMap = new Map(leaders.map((l) => [l.id, l.name]));

    return {
      kind,
      total,
      page,
      items: coops.map((c) => ({
        id: c.id,
        name: c.name,
        region: c.region,
        description: c.description,
        members: c._count.members,
        leader: { id: c.leaderId, name: leaderMap.get(c.leaderId) ?? "Líder" },
      })),
    };
  }

  if (kind === "ONGS") {
    const items = await listOrganizations({ q: filters.q, region: filters.region });
    return { kind, total: items.length, page: 1, items: items.filter((o) => o.ownerId !== userId) };
  }

  const roleValue = DISCOVER_ROLE[kind];
  if (!roleValue) {
    throw new Error("Escolha o que quer procurar.");
  }

  const where: any = { role: roleValue as any, isActive: true };
  if (filters.region) where.location = { contains: filters.region, mode: "insensitive" };
  if (filters.q) where.name = { contains: filters.q, mode: "insensitive" };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, location: true, isVerified: true, role: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const ids = users.map((u) => u.id);
  const [products, registered] =
    ids.length > 0
      ? await Promise.all([
          prisma.product.groupBy({
            by: ["ownerId"],
            where: { ownerId: { in: ids }, isAvailable: true },
            _count: { _all: true },
          }),
          prisma.ngoBeneficiary.findMany({ where: { ownerId: userId, userId: { in: ids } }, select: { userId: true } }),
        ])
      : [[], []];

  const productMap = new Map((products as any[]).map((p) => [p.ownerId, p._count._all]));
  const registeredSet = new Set((registered as any[]).map((r) => r.userId));

  return {
    kind,
    total,
    page,
    items: users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      location: u.location,
      isVerified: u.isVerified,
      productsCount: productMap.get(u.id) ?? 0,
      alreadyBeneficiary: registeredSet.has(u.id),
    })),
  };
}
