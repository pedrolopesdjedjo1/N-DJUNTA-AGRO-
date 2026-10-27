import { prisma } from "../lib/prisma";
import { endAllSanctions, forgetBlocked } from "../lib/accountBlock";
import { clean } from "../lib/agentScope";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const DAY = 86400000;

// Aplica uma suspensão ou um bloqueio. Os produtos à venda ficam escondidos enquanto durar.
export async function applySanction(
  adminId: string,
  userId: string,
  kind: "SUSPENSAO" | "BLOQUEIO",
  reasonInput: any,
  endsAt: Date | null,
  reportId?: string | null
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }
  if (String(user.role) === "ADMIN") {
    throw new Error("As contas de administrador gerem-se na equipa.");
  }
  if (userId === adminId) {
    throw new Error("Não pode aplicar uma sanção à sua própria conta.");
  }

  const reason = clean(reasonInput, 300);
  if (!reason || reason.length < 5) {
    throw new Error("Explique o motivo (pelo menos 5 letras).");
  }

  const active = await prisma.userSanction.findMany({ where: { userId, status: "ATIVA" } });
  if (active.some((s) => s.kind === "BLOQUEIO")) {
    throw new Error("Esta conta já está bloqueada.");
  }
  if (kind === "SUSPENSAO" && active.some((s) => s.kind === "SUSPENSAO")) {
    throw new Error("Esta conta já está suspensa.");
  }

  const products = await prisma.product.findMany({ where: { ownerId: userId, isAvailable: true }, select: { id: true }, take: 2000 });
  const hidden = products.map((p) => p.id);

  const sanction = await prisma.userSanction.create({
    data: { userId, kind, reason, endsAt, hiddenProductIds: hidden, reportId: reportId ?? null, createdBy: adminId },
  });
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  if (hidden.length > 0) {
    await prisma.product.updateMany({ where: { id: { in: hidden } }, data: { isAvailable: false } });
  }
  forgetBlocked();

  const label = kind === "BLOQUEIO" ? "bloqueada" : "suspensa";
  await prisma.notification.create({
    data: {
      userId,
      type: "SISTEMA",
      title: kind === "BLOQUEIO" ? "A sua conta foi bloqueada" : "A sua conta foi suspensa",
      message: `Motivo: ${reason}${endsAt ? ` A suspensão termina em ${endsAt.toLocaleDateString("pt-PT")}.` : ""} Fale com o suporte: 955 407 156.`,
      relatedId: sanction.id,
    },
  });
  await logAudit(adminId, kind === "BLOQUEIO" ? "USER_BLOCK" : "USER_SUSPEND", { type: "USER", id: userId }, `Conta de ${user.name} ${label}: ${reason}`, {
    until: endsAt,
    hiddenProducts: hidden.length,
    reportId: reportId ?? null,
  });

  return sanction;
}

export async function suspendUser(admin: AdminSnapshot, userId: string, input: any) {
  const days = Math.floor(Number(input?.days));
  if (isNaN(days) || days < 1 || days > 365) {
    throw new Error("Indique por quantos dias (de 1 a 365).");
  }
  return applySanction(admin.userId, userId, "SUSPENSAO", input?.reason, new Date(Date.now() + days * DAY));
}

export async function blockUser(admin: AdminSnapshot, userId: string, input: any) {
  return applySanction(admin.userId, userId, "BLOQUEIO", input?.reason, null);
}

export async function reactivateUser(admin: AdminSnapshot, userId: string, input: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, isActive: true } });
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }

  const note = clean(input?.note, 300);
  if (!note || note.length < 3) {
    throw new Error("Explique porque a conta volta a funcionar.");
  }

  const active = await prisma.userSanction.count({ where: { userId, status: "ATIVA" } });
  if (user.isActive && active === 0) {
    throw new Error("Esta conta já está ativa.");
  }

  const ended = await endAllSanctions(userId, admin.userId, note);
  await prisma.notification.create({
    data: { userId, type: "SISTEMA", title: "A sua conta foi reativada", message: "Já pode voltar a usar o NÔDJUNTA AGRO.", relatedId: userId },
  });
  await logAudit(admin.userId, "USER_REACTIVATE", { type: "USER", id: userId }, `Reativou a conta de ${user.name}: ${note}`, { sanctionsEnded: ended });

  return { userId, reactivated: true };
}
