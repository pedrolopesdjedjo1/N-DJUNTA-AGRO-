import { prisma } from "../lib/prisma";
import { IDENTITY_DOC_KINDS, IDENTITY_STATUS, isStorageUrl, roleName } from "../lib/adminUserCatalog";
import { values } from "../lib/ngoCatalog";
import { clean, plain } from "../lib/agentScope";
import { AdminSnapshot, loadAdmin } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const KIND_VALUES = values(IDENTITY_DOC_KINDS);
const STATUS_VALUES = values(IDENTITY_STATUS);

async function notifyReviewers(title: string, message: string, relatedId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const snaps = await Promise.all(admins.map((a) => loadAdmin(a.id)));
  const ids = snaps.filter((s) => s && s.status === "ATIVO" && s.permissions.has("users.verify")).map((s) => (s as AdminSnapshot).userId);
  if (ids.length === 0) return;

  await prisma.notification.createMany({ data: ids.map((userId) => ({ userId, type: "SISTEMA" as const, title, message, relatedId })) });
}

// =====================================================================
// Do lado da pessoa: pedir a verificação
// =====================================================================
export async function submitIdentity(userId: string, input: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, isVerified: true, isActive: true } });
  if (!user || !user.isActive) {
    throw new Error("Conta não encontrada.");
  }
  if (user.isVerified) {
    throw new Error("A sua conta já está verificada.");
  }

  const pending = await prisma.identityVerification.findFirst({ where: { userId, status: "PENDENTE" } });
  if (pending) {
    throw new Error("Já enviou um pedido e está a ser analisado.");
  }

  const kind = String(input?.documentKind ?? "");
  if (!KIND_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de documento.");
  }
  if (!isStorageUrl(input?.documentUrl)) {
    throw new Error("Envie a foto do documento pelo app.");
  }
  if (input?.selfieUrl && !isStorageUrl(input.selfieUrl)) {
    throw new Error("Foto inválida.");
  }

  const created = await prisma.identityVerification.create({
    data: { userId, documentKind: kind, documentUrl: input.documentUrl, selfieUrl: input.selfieUrl || null, note: clean(input?.note, 300) },
  });
  await notifyReviewers("Pedido de verificação de identidade", `${user.name} enviou um documento para verificar.`, created.id);

  return created;
}

export async function myIdentity(userId: string) {
  const [user, items] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } }),
    prisma.identityVerification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, documentKind: true, status: true, reviewNote: true, createdAt: true, reviewedAt: true },
    }),
  ]);
  return { isVerified: !!user?.isVerified, items };
}

// =====================================================================
// Equipa: analisar os pedidos
// =====================================================================
export async function listIdentity(filters: { status?: string; q?: string; page?: number }) {
  const status = filters.status && STATUS_VALUES.includes(filters.status) ? filters.status : "PENDENTE";
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const needle = plain(filters.q);

  const [groups, rows] = await Promise.all([
    prisma.identityVerification.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.identityVerification.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDENTE" ? "asc" : "desc" },
      skip: needle ? 0 : (page - 1) * PAGE_SIZE,
      take: needle ? 300 : PAGE_SIZE,
    }),
  ]);

  const ids = Array.from(new Set(rows.map((r) => r.userId)));
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, role: true, location: true, photoUrl: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  let items = rows.map((r) => ({
    ...r,
    user: userMap.get(r.userId) ? { ...userMap.get(r.userId)!, roleName: roleName(userMap.get(r.userId)!.role) } : null,
  }));
  if (needle) items = items.filter((i) => plain(`${i.user?.name} ${i.user?.phone}`).includes(needle));

  return { counts, page, pageSize: PAGE_SIZE, items };
}

export async function getIdentity(id: string) {
  const item = await prisma.identityVerification.findUnique({ where: { id } });
  if (!item) {
    throw new Error("Pedido não encontrado.");
  }

  const [user, previous] = await Promise.all([
    prisma.user.findUnique({ where: { id: item.userId }, select: { id: true, name: true, phone: true, role: true, location: true, photoUrl: true, isVerified: true, createdAt: true } }),
    prisma.identityVerification.findMany({ where: { userId: item.userId, id: { not: id } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return { item, user: user ? { ...user, roleName: roleName(user.role) } : null, previous };
}

export async function reviewIdentity(admin: AdminSnapshot, id: string, input: any) {
  const item = await prisma.identityVerification.findUnique({ where: { id } });
  if (!item) {
    throw new Error("Pedido não encontrado.");
  }
  if (item.status !== "PENDENTE") {
    throw new Error("Este pedido já foi analisado.");
  }

  const approve = input?.approve === true;
  const note = clean(input?.note, 300);
  if (!approve && (!note || note.length < 3)) {
    throw new Error("Explique o motivo da recusa, para a pessoa corrigir.");
  }

  const user = await prisma.user.findUnique({ where: { id: item.userId }, select: { name: true } });

  await prisma.identityVerification.update({
    where: { id },
    data: { status: approve ? "APROVADA" : "RECUSADA", reviewNote: note, reviewedBy: admin.userId, reviewedAt: new Date() },
  });
  if (approve) {
    await prisma.user.update({ where: { id: item.userId }, data: { isVerified: true } });
  }

  await prisma.notification.create({
    data: {
      userId: item.userId,
      type: "SISTEMA",
      title: approve ? "Identidade verificada ✅" : "Pedido de verificação recusado",
      message: approve ? "A sua conta foi verificada. Os outros veem o selo no seu perfil." : `Motivo: ${note}. Pode enviar de novo.`,
      relatedId: id,
    },
  });
  await logAudit(admin.userId, approve ? "USER_VERIFY" : "USER_UNVERIFY", { type: "USER", id: item.userId }, `${approve ? "Aprovou" : "Recusou"} a verificação de ${user?.name ?? "um utilizador"}${note ? `: ${note}` : ""}`, { identityId: id });

  return { id, status: approve ? "APROVADA" : "RECUSADA" };
}
