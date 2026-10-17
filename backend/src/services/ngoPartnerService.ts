import { prisma } from "../lib/prisma";
import { PARTNER_STATUS, PARTNER_TYPES, values } from "../lib/ngoCatalog";
import { assertNgo } from "./organizationService";

const TYPE_VALUES = values(PARTNER_TYPES);
const STATUS_VALUES = values(PARTNER_STATUS);
const MAX_PARTNERS = 200;
const MAX_PER_PROJECT = 30;

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

async function ownPartner(userId: string, id: string) {
  const partner = await prisma.ngoPartner.findUnique({ where: { id } });
  if (!partner || partner.ownerId !== userId) {
    throw new Error("Parceiro não encontrado.");
  }
  return partner;
}

async function ownProject(userId: string, id: string) {
  const project = await prisma.ngoProject.findUnique({ where: { id } });
  if (!project || project.ownerId !== userId) {
    throw new Error("Projeto não encontrado.");
  }
  return project;
}

export async function listPartners(
  userId: string,
  role: string | undefined,
  filters: { type?: string; status?: string; q?: string }
) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.type && TYPE_VALUES.includes(filters.type)) where.type = filters.type;
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.q) where.name = { contains: filters.q, mode: "insensitive" };

  const partners = await prisma.ngoPartner.findMany({ where, orderBy: { name: "asc" }, take: 200 });
  const ids = partners.map((p) => p.id);

  const links = ids.length
    ? await prisma.ngoProjectPartner.groupBy({ by: ["partnerId"], where: { partnerId: { in: ids } }, _count: { _all: true } })
    : [];
  const counts = new Map(links.map((l) => [l.partnerId, l._count._all]));

  return partners.map((p) => ({ ...p, projectsCount: counts.get(p.id) ?? 0 }));
}

async function readPartner(userId: string, input: any, existing?: any) {
  const data: any = {};
  let linked: { id: string; name: string } | null = null;

  if (input?.linkedUserId) {
    if (String(input.linkedUserId) === userId) {
      throw new Error("Não pode ser parceiro de si próprio.");
    }
    linked = await prisma.user.findUnique({ where: { id: String(input.linkedUserId) }, select: { id: true, name: true } });
    if (!linked) {
      throw new Error("Pessoa ou organização do app não encontrada.");
    }
    data.linkedUserId = linked.id;
  } else if (input?.linkedUserId === null) {
    data.linkedUserId = null;
  }

  if (!existing || input?.name !== undefined) {
    const name = clean(input?.name, 120) ?? (linked ? linked.name : null);
    if (!name || name.length < 2) {
      throw new Error("Escreva o nome do parceiro.");
    }
    data.name = name;
  }

  if (!existing || input?.type !== undefined) {
    const type = String(input?.type ?? "LOCAL");
    if (!TYPE_VALUES.includes(type)) {
      throw new Error("Tipo de parceiro inválido.");
    }
    data.type = type;
  }
  if (input?.status !== undefined) {
    if (!STATUS_VALUES.includes(String(input.status))) {
      throw new Error("Estado inválido.");
    }
    data.status = String(input.status);
  }

  if (input?.contactName !== undefined) data.contactName = clean(input.contactName, 120);
  if (input?.phone !== undefined) data.phone = readPhone(input.phone);
  if (input?.email !== undefined) data.email = readEmail(input.email);
  if (input?.website !== undefined) data.website = readWebsite(input.website);
  if (input?.region !== undefined) data.region = clean(input.region, 80);
  if (input?.notes !== undefined) data.notes = clean(input.notes, 500);

  return data;
}

export async function createPartner(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const count = await prisma.ngoPartner.count({ where: { ownerId: userId } });
  if (count >= MAX_PARTNERS) {
    throw new Error(`Pode registar até ${MAX_PARTNERS} parceiros.`);
  }

  const data = await readPartner(userId, input);
  return prisma.ngoPartner.create({ data: { ownerId: userId, ...data } });
}

export async function updatePartner(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  const partner = await ownPartner(userId, id);

  const data = await readPartner(userId, input, partner);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  return prisma.ngoPartner.update({ where: { id }, data });
}

export async function deletePartner(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  await ownPartner(userId, id);
  await prisma.ngoPartner.delete({ where: { id } });
  return { id, deleted: true };
}

export async function getPartner(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const partner = await ownPartner(userId, id);

  const [links, funding] = await Promise.all([
    prisma.ngoProjectPartner.findMany({ where: { partnerId: id } }),
    prisma.ngoFunding.findMany({ where: { partnerId: id, ownerId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const projects = links.length
    ? await prisma.ngoProject.findMany({
        where: { id: { in: links.map((l) => l.projectId) } },
        select: { id: true, name: true, status: true, area: true },
      })
    : [];
  const roleMap = new Map(links.map((l) => [l.projectId, l.role]));

  return {
    partner,
    projects: projects.map((p) => ({ ...p, role: roleMap.get(p.id) ?? null })),
    funding,
  };
}

// ---------- Parceiros de um projeto ----------
export async function projectPartners(userId: string, role: string | undefined, projectId: string) {
  assertNgo(role);
  await ownProject(userId, projectId);

  const links = await prisma.ngoProjectPartner.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
  if (links.length === 0) return [];

  const partners = await prisma.ngoPartner.findMany({ where: { id: { in: links.map((l) => l.partnerId) } } });
  const map = new Map(partners.map((p) => [p.id, p]));

  return links
    .map((l) => ({ linkId: l.id, role: l.role, partner: map.get(l.partnerId) ?? null }))
    .filter((x) => x.partner);
}

export async function linkPartner(userId: string, role: string | undefined, projectId: string, input: any) {
  assertNgo(role);
  await ownProject(userId, projectId);
  const partner = await ownPartner(userId, String(input?.partnerId ?? ""));

  const count = await prisma.ngoProjectPartner.count({ where: { projectId } });
  if (count >= MAX_PER_PROJECT) {
    throw new Error(`Cada projeto aceita até ${MAX_PER_PROJECT} parceiros.`);
  }

  const exists = await prisma.ngoProjectPartner.findFirst({ where: { projectId, partnerId: partner.id } });
  if (exists) {
    throw new Error("Este parceiro já está ligado ao projeto.");
  }

  await prisma.ngoProjectPartner.create({
    data: { projectId, partnerId: partner.id, role: clean(input?.role, 80) },
  });
  return projectPartners(userId, role, projectId);
}

export async function unlinkPartner(userId: string, role: string | undefined, projectId: string, partnerId: string) {
  assertNgo(role);
  await ownProject(userId, projectId);
  await prisma.ngoProjectPartner.deleteMany({ where: { projectId, partnerId } });
  return projectPartners(userId, role, projectId);
}
