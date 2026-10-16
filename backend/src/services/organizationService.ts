import { prisma } from "../lib/prisma";
import { AREAS, values } from "../lib/ngoCatalog";
import { DOCUMENT_KINDS } from "../lib/ngoCatalog";

const AREA_VALUES = values(AREAS);
const DOCUMENT_VALUES = values(DOCUMENT_KINDS);
const MAX_DOCUMENTS = 15;

export function assertNgo(role?: string) {
  if (role !== "ONG" && role !== "ADMIN") {
    throw new Error("Esta área é reservada às organizações (ONG).");
  }
}

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function validStorageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
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

async function notifyAdmins(title: string, message: string, relatedId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "SISTEMA" as const,
      title,
      message,
      relatedId,
    })),
  });
}

export async function ensureOrganization(userId: string) {
  const found = await prisma.organization.findUnique({ where: { ownerId: userId } });
  if (found) return found;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, location: true },
  });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  return prisma.organization.create({
    data: { ownerId: userId, name: user.name, phone: user.phone ?? null, region: user.location ?? null },
  });
}

function checklist(org: any, documents: any[]) {
  const items = [
    { key: "name", label: "Nome da organização", done: !!org.name && org.name.length >= 2 },
    { key: "registration", label: "Número do registo oficial", done: !!org.registrationNumber },
    { key: "responsible", label: "Nome e telefone do responsável", done: !!org.responsibleName && !!org.responsiblePhone },
    { key: "contacts", label: "Telefone ou e-mail da organização", done: !!org.phone || !!org.email },
    { key: "document", label: "Documento do registo oficial", done: documents.some((d) => d.kind === "REGISTO_OFICIAL") },
  ];
  return { items, canSubmit: items.every((i) => i.done), missing: items.filter((i) => !i.done).map((i) => i.label) };
}

export async function getOrganization(userId: string, role?: string) {
  assertNgo(role);
  const org = await ensureOrganization(userId);

  const [documents, projectsCount, user] = await Promise.all([
    prisma.organizationDocument.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } }),
    prisma.ngoProject.count({ where: { ownerId: userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } }),
  ]);

  return {
    organization: org,
    documents,
    projectsCount,
    isVerified: !!user?.isVerified,
    verification: { status: org.verificationStatus, note: org.verificationNote, ...checklist(org, documents) },
  };
}

export async function saveOrganization(userId: string, role: string | undefined, input: any) {
  assertNgo(role);
  const before = await ensureOrganization(userId);
  const data: any = {};

  if (input?.name !== undefined) {
    const name = clean(input.name, 120);
    if (!name || name.length < 2) {
      throw new Error("Escreva o nome da organização.");
    }
    data.name = name;
  }
  if (input?.acronym !== undefined) data.acronym = clean(input.acronym, 20);
  if (input?.description !== undefined) data.description = clean(input.description, 1500);
  if (Array.isArray(input?.areas)) {
    data.areas = input.areas.map(String).filter((a: string) => AREA_VALUES.includes(a)).slice(0, 8);
  }
  if (input?.region !== undefined) data.region = clean(input.region, 80);
  if (input?.address !== undefined) data.address = clean(input.address, 200);
  if (input?.phone !== undefined) data.phone = readPhone(input.phone);
  if (input?.email !== undefined) data.email = readEmail(input.email);
  if (input?.website !== undefined) data.website = readWebsite(input.website);
  if (input?.facebook !== undefined) data.facebook = clean(input.facebook, 200);
  if (input?.instagram !== undefined) data.instagram = clean(input.instagram, 200);
  if (input?.whatsapp !== undefined) data.whatsapp = readPhone(input.whatsapp);
  if (input?.logoUrl !== undefined) {
    if (input.logoUrl && !validStorageUrl(input.logoUrl)) {
      throw new Error("Logo inválido.");
    }
    data.logoUrl = input.logoUrl || null;
  }
  if (input?.foundedYear !== undefined) {
    if (input.foundedYear === null || input.foundedYear === "") {
      data.foundedYear = null;
    } else {
      const year = Math.floor(Number(input.foundedYear));
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        throw new Error("Ano de fundação inválido.");
      }
      data.foundedYear = year;
    }
  }
  if (input?.registrationNumber !== undefined) data.registrationNumber = clean(input.registrationNumber, 60);
  if (input?.responsibleName !== undefined) data.responsibleName = clean(input.responsibleName, 120);
  if (input?.responsibleRole !== undefined) data.responsibleRole = clean(input.responsibleRole, 80);
  if (input?.responsiblePhone !== undefined) data.responsiblePhone = readPhone(input.responsiblePhone);
  if (input?.responsibleEmail !== undefined) data.responsibleEmail = readEmail(input.responsibleEmail);

  // Mudar o registo oficial depois de verificada exige nova verificação
  const registrationChanged =
    data.registrationNumber !== undefined &&
    data.registrationNumber !== before.registrationNumber &&
    before.verificationStatus === "APROVADO";
  if (registrationChanged) {
    data.verificationStatus = "NAO_ENVIADO";
    data.verificationNote = "O registo oficial foi alterado. Envie de novo para verificação.";
  }

  if (Object.keys(data).length > 0) {
    await prisma.organization.update({ where: { id: before.id }, data });
  }

  const userData: any = {};
  if (data.name) userData.name = data.name;
  if (registrationChanged) userData.isVerified = false;
  if (Object.keys(userData).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: userData });
  }

  return getOrganization(userId, role);
}

export async function addDocument(userId: string, role: string | undefined, input: any) {
  assertNgo(role);
  const org = await ensureOrganization(userId);

  const kind = String(input?.kind ?? "");
  if (!DOCUMENT_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de documento.");
  }
  const name = clean(input?.name, 100);
  if (!name) {
    throw new Error("Escreva o nome do documento.");
  }
  if (!validStorageUrl(input?.url)) {
    throw new Error("Ficheiro inválido. Envie o documento pelo app.");
  }

  const count = await prisma.organizationDocument.count({ where: { organizationId: org.id } });
  if (count >= MAX_DOCUMENTS) {
    throw new Error(`Pode guardar até ${MAX_DOCUMENTS} documentos.`);
  }

  await prisma.organizationDocument.create({ data: { organizationId: org.id, kind, name, url: input.url } });
  return getOrganization(userId, role);
}

export async function deleteDocument(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const org = await ensureOrganization(userId);

  const found = await prisma.organizationDocument.findUnique({ where: { id } });
  if (!found || found.organizationId !== org.id) {
    throw new Error("Documento não encontrado.");
  }

  await prisma.organizationDocument.delete({ where: { id } });
  return getOrganization(userId, role);
}

export async function submitVerification(userId: string, role: string | undefined) {
  assertNgo(role);
  const org = await ensureOrganization(userId);

  if (org.verificationStatus === "PENDENTE") {
    throw new Error("A verificação já foi enviada e está a ser analisada.");
  }
  if (org.verificationStatus === "APROVADO") {
    throw new Error("A organização já está verificada.");
  }

  const documents = await prisma.organizationDocument.findMany({ where: { organizationId: org.id } });
  const check = checklist(org, documents);
  if (!check.canSubmit) {
    throw new Error(`Complete antes de enviar: ${check.missing.join(", ")}.`);
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { verificationStatus: "PENDENTE", verificationSubmittedAt: new Date(), verificationNote: null },
  });

  await notifyAdmins("Verificação de ONG pendente", `${org.name} enviou os documentos para verificação.`, org.id);
  return getOrganization(userId, role);
}

// ---------- Equipa do app ----------
export async function listPendingVerifications(role?: string) {
  if (role !== "ADMIN") {
    throw new Error("Acesso restrito à equipa do NÔDJUNTA AGRO.");
  }

  const orgs = await prisma.organization.findMany({
    where: { verificationStatus: "PENDENTE" },
    orderBy: { verificationSubmittedAt: "asc" },
  });
  if (orgs.length === 0) return [];

  const [documents, users] = await Promise.all([
    prisma.organizationDocument.findMany({ where: { organizationId: { in: orgs.map((o) => o.id) } } }),
    prisma.user.findMany({
      where: { id: { in: orgs.map((o) => o.ownerId) } },
      select: { id: true, name: true, phone: true },
    }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  return orgs.map((o) => ({
    organization: o,
    documents: documents.filter((d) => d.organizationId === o.id),
    owner: userMap.get(o.ownerId) ?? null,
  }));
}

export async function reviewVerification(role: string | undefined, ownerId: string, approve: boolean, note: any) {
  if (role !== "ADMIN") {
    throw new Error("Acesso restrito à equipa do NÔDJUNTA AGRO.");
  }

  const org = await prisma.organization.findUnique({ where: { ownerId } });
  if (!org) {
    throw new Error("Organização não encontrada.");
  }
  if (org.verificationStatus !== "PENDENTE") {
    throw new Error("Esta organização não tem verificação pendente.");
  }

  const text = clean(note, 500);
  if (!approve && !text) {
    throw new Error("Explique o motivo da recusa.");
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      verificationStatus: approve ? "APROVADO" : "RECUSADO",
      verificationReviewedAt: new Date(),
      verificationNote: text,
    },
  });
  await prisma.user.update({ where: { id: ownerId }, data: { isVerified: approve } });

  await prisma.notification.create({
    data: {
      userId: ownerId,
      type: "SISTEMA",
      title: approve ? "ONG verificada ✅" : "Verificação recusada",
      message: approve
        ? "A sua organização foi verificada."
        : `A verificação foi recusada: ${text}. Corrija e envie de novo.`,
      relatedId: org.id,
    },
  });

  return { ownerId, status: approve ? "APROVADO" : "RECUSADO" };
}

// ---------- Perfil público ----------
export async function getPublicOrganization(ownerId: string) {
  const org = await prisma.organization.findUnique({ where: { ownerId } });
  if (!org) {
    throw new Error("Organização não encontrada.");
  }

  const [user, projects] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { isVerified: true } }),
    prisma.ngoProject.findMany({
      where: { ownerId, isPublic: true },
      select: { id: true, name: true, area: true, status: true, region: true, coverUrl: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    organization: {
      id: org.id,
      ownerId: org.ownerId,
      name: org.name,
      acronym: org.acronym,
      description: org.description,
      areas: org.areas,
      region: org.region,
      phone: org.phone,
      email: org.email,
      website: org.website,
      facebook: org.facebook,
      instagram: org.instagram,
      whatsapp: org.whatsapp,
      logoUrl: org.logoUrl,
      foundedYear: org.foundedYear,
    },
    isVerified: !!user?.isVerified,
    projects,
  };
}
