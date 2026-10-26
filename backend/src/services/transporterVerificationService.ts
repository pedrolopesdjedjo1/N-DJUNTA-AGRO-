import { prisma } from "../lib/prisma";
import { TRANSPORTER_DOCUMENT_KINDS, VERIFICATION_STATUS } from "../lib/transportCatalog";
import { values } from "../lib/ngoCatalog";
import { clean, plain } from "../lib/agentScope";
import { assertTransporter, checklist, ensureProfile, getProfile, shapeDocuments } from "./transporterService";

const DOC_VALUES = values(TRANSPORTER_DOCUMENT_KINDS);
const STATUS_VALUES = values(VERIFICATION_STATUS);
const MAX_DOCUMENTS = 8;

function validStorageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

function assertAdmin(role?: string) {
  if (role !== "ADMIN") {
    throw new Error("Acesso restrito à equipa do NÔDJUNTA AGRO.");
  }
}

async function notifyAdmins(title: string, message: string, relatedId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "SISTEMA" as const, title, message, relatedId })),
  });
}

// =====================================================================
// Documentos do transportador
// =====================================================================
export async function addDocument(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);

  const kind = String(input?.kind ?? "");
  if (!DOC_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de documento.");
  }
  const name = clean(input?.name, 100);
  if (!name) {
    throw new Error("Escreva o nome do documento.");
  }
  if (!validStorageUrl(input?.url)) {
    throw new Error("Ficheiro inválido. Envie o documento pelo app.");
  }

  let expiresAt: Date | null = null;
  if (input?.expiresAt) {
    expiresAt = new Date(input.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw new Error("Data de validade inválida.");
    }
    if (expiresAt.getTime() < Date.now()) {
      throw new Error("Este documento já está fora do prazo. Envie um documento válido.");
    }
  }

  const count = await prisma.transporterDocument.count({ where: { transporterId: userId } });
  if (count >= MAX_DOCUMENTS) {
    throw new Error(`Pode guardar até ${MAX_DOCUMENTS} documentos.`);
  }

  await prisma.transporterDocument.create({ data: { transporterId: userId, kind, name, url: input.url, expiresAt } });
  return getProfile(userId, role);
}

export async function deleteDocument(userId: string, role: string | undefined, id: string) {
  assertTransporter(role);

  const found = await prisma.transporterDocument.findUnique({ where: { id } });
  if (!found || found.transporterId !== userId) {
    throw new Error("Documento não encontrado.");
  }

  await prisma.transporterDocument.delete({ where: { id } });
  return getProfile(userId, role);
}

// =====================================================================
// Verificação
// =====================================================================
export async function submitVerification(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  if (profile.verificationStatus === "PENDENTE") {
    throw new Error("A verificação já foi enviada e está a ser analisada.");
  }

  const [user, documents] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true, photoUrl: true, isVerified: true } }),
    prisma.transporterDocument.findMany({ where: { transporterId: userId } }),
  ]);
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }
  if (profile.verificationStatus === "APROVADO" || user.isVerified) {
    throw new Error("A sua conta já está verificada.");
  }

  const expired = shapeDocuments(documents).filter((d) => d.expired);
  if (expired.length > 0) {
    throw new Error(`Há documentos fora do prazo: ${expired.map((d) => d.name).join(", ")}. Apague-os e envie documentos válidos.`);
  }

  const check = checklist(profile, user, documents);
  if (!check.canSubmit) {
    throw new Error(`Complete antes de enviar: ${check.missing.join(", ")}.`);
  }

  await prisma.transporterProfile.update({
    where: { userId },
    data: { verificationStatus: "PENDENTE", submittedAt: new Date(), verificationNote: null },
  });
  await notifyAdmins("Transportador para verificar", `${user.name} enviou os documentos para verificação.`, profile.id);

  return getProfile(userId, role);
}

// =====================================================================
// Equipa do app: verificar transportadores
// =====================================================================
export async function adminListTransporters(role: string | undefined, filters: { status?: string; q?: string }) {
  assertAdmin(role);

  const status = filters.status && STATUS_VALUES.includes(filters.status) ? filters.status : "PENDENTE";
  const [profiles, groups] = await Promise.all([
    prisma.transporterProfile.findMany({ where: { verificationStatus: status }, orderBy: { submittedAt: "asc" }, take: 200 }),
    prisma.transporterProfile.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
  ]);

  const ids = profiles.map((p) => p.userId);
  const [users, documents, delivered] = ids.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true } }),
        prisma.transporterDocument.findMany({ where: { transporterId: { in: ids } }, orderBy: { createdAt: "desc" } }),
        prisma.deliveryEvent.groupBy({ by: ["actorId"], where: { actorId: { in: ids }, kind: "ENTREGUE" }, _count: { _all: true } }),
      ])
    : [[], [], []];

  const userMap = new Map((users as any[]).map((u) => [u.id, u]));
  const deliveredMap = new Map((delivered as any[]).map((d) => [d.actorId, d._count._all]));

  const needle = plain(filters.q);
  const items = profiles
    .map((p) => ({
      profile: p,
      user: userMap.get(p.userId) ?? null,
      documents: shapeDocuments((documents as any[]).filter((d) => d.transporterId === p.userId)),
      delivered: deliveredMap.get(p.userId) ?? 0,
    }))
    .filter((i) => !needle || plain(`${i.user?.name} ${i.user?.phone}`).includes(needle));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.verificationStatus] = g._count._all));

  return { counts, items };
}

export async function adminReviewTransporter(role: string | undefined, adminId: string, transporterUserId: string, input: any) {
  assertAdmin(role);

  const profile = await prisma.transporterProfile.findUnique({ where: { userId: transporterUserId } });
  if (!profile) {
    throw new Error("Transportador não encontrado.");
  }
  if (profile.verificationStatus !== "PENDENTE") {
    throw new Error("Este transportador não tem verificação pendente.");
  }

  const approve = input?.approve === true;
  const note = clean(input?.note, 500);
  if (!approve && (!note || note.length < 3)) {
    throw new Error("Explique o motivo da recusa.");
  }

  await prisma.transporterProfile.update({
    where: { userId: transporterUserId },
    data: { verificationStatus: approve ? "APROVADO" : "RECUSADO", verificationNote: note, reviewedAt: new Date(), reviewedBy: adminId },
  });
  await prisma.user.update({ where: { id: transporterUserId }, data: { isVerified: approve } });

  await prisma.notification.create({
    data: {
      userId: transporterUserId,
      type: "SISTEMA",
      title: approve ? "Transportador verificado ✅" : "Verificação recusada",
      message: approve ? "A sua conta foi verificada. Quem encomenda vê o selo no seu perfil." : `Motivo: ${note}. Corrija e envie de novo.`,
      relatedId: profile.id,
    },
  });

  return { userId: transporterUserId, status: approve ? "APROVADO" : "RECUSADO" };
}
