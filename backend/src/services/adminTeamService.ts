import { prisma } from "../lib/prisma";
import { LEVEL_INFO, PERMISSIONS, RESERVED_PERMISSIONS, permissionsFor } from "../lib/adminCatalog";
import { CLIENT_ROLES } from "../lib/agentCatalog";
import { clean, plain } from "../lib/agentScope";
import { activeSuperIds, ensureAdminProfile, forgetAdminCache, notifyAdminsWith, AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const LEVEL_VALUES = LEVEL_INFO.map((l) => l.value);
const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

function digits(value: any): string {
  return String(value ?? "").replace(/\D/g, "");
}

function readPermissions(input: any, level: string): string[] {
  if (!Array.isArray(input)) return [];

  const list = Array.from(new Set(input.map(String))) as string[];
  if (!list.every((k) => PERMISSION_KEYS.includes(k))) {
    throw new Error("Permissão inválida.");
  }
  if (level !== "SUPER_ADMIN" && list.some((k) => RESERVED_PERMISSIONS.includes(k))) {
    throw new Error("As permissões de gerir a equipa e a segurança só existem no nível Super administrador.");
  }
  return list;
}

function levelLabel(level: string): string {
  return LEVEL_INFO.find((l) => l.value === level)?.label ?? level;
}

async function mustKeepOneSuper(excludingId: string) {
  const supers = (await activeSuperIds()).filter((id) => id !== excludingId);
  if (supers.length === 0) {
    throw new Error("Tem de ficar pelo menos um Super administrador ativo.");
  }
}

// =====================================================================
export async function listAdmins(filters: { q?: string; level?: string; status?: string }) {
  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, phone: true, photoUrl: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  const ids = users.map((u) => u.id);
  const [profiles, sessions] = ids.length
    ? await Promise.all([
        prisma.adminProfile.findMany({ where: { userId: { in: ids } } }),
        prisma.adminSession.groupBy({
          by: ["adminId"],
          where: { adminId: { in: ids }, revokedAt: null, expiresAt: { gt: new Date() } },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const sessionMap = new Map(sessions.map((s) => [s.adminId, s._count._all]));
  const needle = plain(filters.q);

  const items = users
    .map((u) => {
      const p = profileMap.get(u.id);
      const level = p?.level ?? "SUPER_ADMIN";
      return {
        userId: u.id,
        name: u.name,
        phone: u.phone,
        photoUrl: u.photoUrl,
        level,
        levelLabel: levelLabel(level),
        title: p?.title ?? null,
        status: !u.isActive ? "SUSPENSO" : p?.status ?? "ATIVO",
        legacy: !p,
        twoFactorEnabled: !!p?.twoFactorEnabled,
        locked: !!p?.lockedUntil && p.lockedUntil.getTime() > Date.now(),
        lastLoginAt: p?.lastLoginAt ?? null,
        activeSessions: sessionMap.get(u.id) ?? 0,
        createdAt: u.createdAt,
      };
    })
    .filter((i) => !filters.level || i.level === filters.level)
    .filter((i) => !filters.status || i.status === filters.status)
    .filter((i) => !needle || plain(`${i.name} ${i.phone} ${i.title}`).includes(needle));

  return {
    total: items.length,
    withoutTwoFactor: items.filter((i) => !i.twoFactorEnabled && i.status === "ATIVO").length,
    items,
  };
}

export async function getAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, photoUrl: true, location: true, role: true, isActive: true, createdAt: true },
  });
  if (!user || String(user.role) !== "ADMIN") {
    throw new Error("Administrador não encontrado.");
  }

  const profile = await prisma.adminProfile.findUnique({ where: { userId } });
  const level = profile?.level ?? "SUPER_ADMIN";

  const [sessions, audit, events] = await Promise.all([
    prisma.adminSession.findMany({ where: { adminId: userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.adminAudit.findMany({ where: { adminId: userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.adminSecurityEvent.findMany({ where: { adminId: userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return {
    user,
    profile: profile ? { ...profile, twoFactorSecret: undefined, backupCodes: undefined, backupCodesLeft: profile.backupCodes.length } : null,
    level,
    levelLabel: levelLabel(level),
    legacy: !profile,
    status: !user.isActive ? "SUSPENSO" : profile?.status ?? "ATIVO",
    permissions: Array.from(permissionsFor(level, profile?.extraPermissions ?? [], profile?.deniedPermissions ?? [])),
    sessions: sessions.map((s) => ({
      id: s.id,
      method: s.method,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      active: !s.revokedAt && s.expiresAt.getTime() > Date.now(),
    })),
    audit,
    events,
  };
}

// Dá o acesso de administrador a uma conta que já existe (a palavra-passe continua a ser a da própria pessoa)
export async function promote(actor: AdminSnapshot, input: any) {
  const level = String(input?.level ?? "");
  if (!LEVEL_VALUES.includes(level)) {
    throw new Error("Escolha o nível do administrador.");
  }
  const extra = readPermissions(input?.extraPermissions, level);
  const denied = readPermissions(input?.deniedPermissions, level);

  let target: any = null;
  if (input?.userId) {
    target = await prisma.user.findUnique({ where: { id: String(input.userId) } });
  } else {
    const phone = digits(input?.phone);
    if (phone.length < 7) {
      throw new Error("Escreva o telefone da conta que vai ser administrador.");
    }
    const found = await prisma.user.findMany({ where: { phone: { contains: phone.slice(-8) } }, take: 10 });
    target = found.find((u) => digits(u.phone).slice(-8) === phone.slice(-8)) ?? null;
  }

  if (!target || !target.isActive) {
    throw new Error("Não encontrámos uma conta ativa com esses dados. A pessoa tem de se registar primeiro no app.");
  }
  if (String(target.role) === "ADMIN") {
    throw new Error("Esta conta já é de administrador.");
  }

  await prisma.user.update({ where: { id: target.id }, data: { role: "ADMIN" } });
  await prisma.adminProfile.create({
    data: {
      userId: target.id,
      level,
      title: clean(input?.title, 80),
      extraPermissions: extra,
      deniedPermissions: denied,
      previousRole: String(target.role),
      createdBy: actor.userId,
    },
  });
  forgetAdminCache(target.id);

  await notifyAdminsWith([target.id], "Recebeu acesso de administrador", `Nível: ${levelLabel(level)}. Entre na área de administração e ative a autenticação de dois fatores.`, target.id);
  await logAudit(actor.userId, "TEAM_PROMOTE", { type: "ADMIN", id: target.id }, `Deu acesso de ${levelLabel(level)} a ${target.name}`, { level, previousRole: String(target.role) });

  return getAdmin(target.id);
}

export async function updateAdmin(actor: AdminSnapshot, userId: string, input: any) {
  const current = await getAdmin(userId);
  const profile = await ensureAdminProfile(userId);

  const level = input?.level !== undefined ? String(input.level) : profile.level;
  if (!LEVEL_VALUES.includes(level)) {
    throw new Error("Nível inválido.");
  }
  if (level !== profile.level) {
    if (userId === actor.userId) {
      throw new Error("Não pode mudar o seu próprio nível.");
    }
    if (profile.level === "SUPER_ADMIN") await mustKeepOneSuper(userId);
  }

  const extra = input?.extraPermissions !== undefined ? readPermissions(input.extraPermissions, level) : profile.extraPermissions;
  const denied = input?.deniedPermissions !== undefined ? readPermissions(input.deniedPermissions, level) : profile.deniedPermissions;

  await prisma.adminProfile.update({
    where: { userId },
    data: {
      level,
      extraPermissions: extra,
      deniedPermissions: denied,
      title: input?.title !== undefined ? clean(input.title, 80) : profile.title,
    },
  });
  forgetAdminCache(userId);

  await logAudit(actor.userId, "TEAM_UPDATE", { type: "ADMIN", id: userId }, `Mudou funções ou permissões de ${current.user.name}`, {
    before: { level: profile.level, extra: profile.extraPermissions, denied: profile.deniedPermissions },
    after: { level, extra, denied },
  });
  await notifyAdminsWith([userId], "As suas permissões mudaram", `O seu nível agora é: ${levelLabel(level)}.`, userId);

  return getAdmin(userId);
}

export async function suspendAdmin(actor: AdminSnapshot, userId: string, noteInput: any) {
  if (userId === actor.userId) {
    throw new Error("Não pode suspender a sua própria conta.");
  }
  const current = await getAdmin(userId);
  const profile = await ensureAdminProfile(userId);

  if (profile.status === "SUSPENSO") {
    throw new Error("Este administrador já está suspenso.");
  }
  if (profile.level === "SUPER_ADMIN") await mustKeepOneSuper(userId);

  const note = clean(noteInput, 300);
  if (!note || note.length < 3) {
    throw new Error("Explique o motivo da suspensão.");
  }

  await prisma.adminProfile.update({ where: { userId }, data: { status: "SUSPENSO", statusNote: note } });
  await prisma.adminSession.updateMany({ where: { adminId: userId, revokedAt: null }, data: { revokedAt: new Date() } });
  forgetAdminCache(userId);

  await logAudit(actor.userId, "TEAM_SUSPEND", { type: "ADMIN", id: userId }, `Suspendeu ${current.user.name}: ${note}`);
  await notifyAdminsWith([userId], "O seu acesso de administrador foi suspenso", `Motivo: ${note}`, userId);
  return getAdmin(userId);
}

export async function reactivateAdmin(actor: AdminSnapshot, userId: string) {
  const current = await getAdmin(userId);
  const profile = await ensureAdminProfile(userId);

  if (profile.status !== "SUSPENSO") {
    throw new Error("Este administrador não está suspenso.");
  }

  await prisma.adminProfile.update({ where: { userId }, data: { status: "ATIVO", statusNote: null } });
  forgetAdminCache(userId);

  await logAudit(actor.userId, "TEAM_REACTIVATE", { type: "ADMIN", id: userId }, `Reativou ${current.user.name}`);
  await notifyAdminsWith([userId], "O seu acesso de administrador foi reativado", "Já pode voltar à área de administração.", userId);
  return getAdmin(userId);
}

// Retira o acesso de administrador e devolve a conta ao perfil que tinha
export async function demoteAdmin(actor: AdminSnapshot, userId: string, roleInput: any) {
  if (userId === actor.userId) {
    throw new Error("Não pode retirar o seu próprio acesso.");
  }
  const current = await getAdmin(userId);
  const profile = await ensureAdminProfile(userId);
  if (profile.level === "SUPER_ADMIN") await mustKeepOneSuper(userId);

  const role = profile.previousRole ?? String(roleInput ?? "");
  if (!role || role === "ADMIN" || !(CLIENT_ROLES.includes(role) || ["ONG", "GOVERNO", "AGENTE"].includes(role))) {
    throw new Error("Escolha o perfil para onde a conta volta.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
  await prisma.adminSession.updateMany({ where: { adminId: userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.adminProfile.delete({ where: { userId } });
  forgetAdminCache(userId);

  await logAudit(actor.userId, "TEAM_DEMOTE", { type: "ADMIN", id: userId }, `Retirou o acesso de administrador a ${current.user.name}`, { returnedTo: role });
  await notifyAdminsWith([userId], "O seu acesso de administrador terminou", "A sua conta voltou ao perfil anterior.", userId);
  return { userId, demoted: true, role };
}
