import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { randomSecret, verifyTotp, otpauthUrl } from "../lib/totp";
import { seal, open } from "../lib/secretBox";
import { getSetting } from "../lib/platformSettings";
import { activeSuperIds, ensureAdminProfile, forgetAdminCache, notifyAdminsWith, AdminSnapshot } from "./adminAccess";
import { logAudit, logSecurity } from "./adminAuditService";

const MAX_SESSIONS = 5;
const DAY = 86400000;

export interface ClientInfo {
  ip: string | null;
  userAgent: string | null;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeBackup(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, "");
}

export async function findSession(adminId: string, token: string) {
  const session = await prisma.adminSession.findFirst({
    where: { adminId, tokenHash: sha256(token), revokedAt: null, expiresAt: { gt: new Date() } },
  });

  if (session && Date.now() - new Date(session.lastSeenAt).getTime() > 60000) {
    prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return session;
}

// Aceita o código do telemóvel (6 números) ou um código de reserva
async function checkCode(profile: any, code: any): Promise<{ ok: boolean; usedBackup: boolean }> {
  const text = String(code ?? "").trim();
  if (!text) return { ok: false, usedBackup: false };

  if (/^\d{3}\s?\d{3}$/.test(text)) {
    try {
      if (profile.twoFactorSecret && verifyTotp(open(profile.twoFactorSecret), text)) return { ok: true, usedBackup: false };
    } catch (error) {
      console.error("checkCode", error);
    }
    return { ok: false, usedBackup: false };
  }

  const hash = sha256(normalizeBackup(text));
  return { ok: (profile.backupCodes as string[]).includes(hash), usedBackup: true };
}

function makeBackupCodes(): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: 8 }, () => {
    const hex = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
  return { plain, hashes: plain.map((c) => sha256(normalizeBackup(c))) };
}

// =====================================================================
// Autenticação de dois fatores
// =====================================================================
export async function setupTwoFactor(adminId: string) {
  const profile = await ensureAdminProfile(adminId);
  if (profile.twoFactorEnabled) {
    throw new Error("A autenticação de dois fatores já está ativa.");
  }

  const user = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true, phone: true } });
  const secret = randomSecret();
  const name = (await getSetting<string>("platform.name")) || "NÔDJUNTA AGRO";

  await prisma.adminProfile.update({ where: { userId: adminId }, data: { twoFactorSecret: seal(secret) } });
  forgetAdminCache(adminId);

  return {
    secret,
    otpauthUrl: otpauthUrl(secret, user?.phone || user?.name || "admin", name),
    instructions: "Abra a sua aplicação de autenticação (Google Authenticator, Microsoft Authenticator ou Authy), escolha adicionar conta e escreva a chave. Depois escreva aqui o código de 6 números.",
  };
}

export async function enableTwoFactor(adminId: string, code: any, info: ClientInfo) {
  const profile = await ensureAdminProfile(adminId);
  if (profile.twoFactorEnabled) {
    throw new Error("A autenticação de dois fatores já está ativa.");
  }
  if (!profile.twoFactorSecret) {
    throw new Error("Comece por gerar a chave.");
  }

  const check = await checkCode(profile, code);
  if (!check.ok || check.usedBackup) {
    throw new Error("Código inválido. Confira a hora do telemóvel e tente de novo.");
  }

  const backup = makeBackupCodes();
  await prisma.adminProfile.update({
    where: { userId: adminId },
    data: { twoFactorEnabled: true, backupCodes: backup.hashes, failedAttempts: 0 },
  });
  forgetAdminCache(adminId);

  await logSecurity(adminId, "TWO_FACTOR_ON", "INFO", "Autenticação de dois fatores ativada.", info);
  await logAudit(adminId, "SECURITY_2FA_ENABLE", { type: "ADMIN", id: adminId }, "Ativou a autenticação de dois fatores");

  return { enabled: true, backupCodes: backup.plain };
}

export async function disableTwoFactor(adminId: string, code: any, info: ClientInfo) {
  const profile = await ensureAdminProfile(adminId);
  if (!profile.twoFactorEnabled) {
    throw new Error("A autenticação de dois fatores não está ativa.");
  }
  if (await getSetting<boolean>("security.require2fa")) {
    throw new Error("A plataforma exige a autenticação de dois fatores a todos os administradores. Não a pode desativar.");
  }

  const check = await checkCode(profile, code);
  if (!check.ok) {
    throw new Error("Código inválido.");
  }

  await prisma.adminProfile.update({
    where: { userId: adminId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [] },
  });
  forgetAdminCache(adminId);

  await logSecurity(adminId, "TWO_FACTOR_OFF", "ALERTA", "Autenticação de dois fatores desativada.", info);
  await logAudit(adminId, "SECURITY_2FA_DISABLE", { type: "ADMIN", id: adminId }, "Desativou a autenticação de dois fatores");
  return { enabled: false };
}

// =====================================================================
// Sessões de administrador
// =====================================================================
export async function startSession(adminId: string, code: any, info: ClientInfo) {
  const profile = await ensureAdminProfile(adminId);

  const [maxFailed, lockMinutes, sessionHours, require2fa] = await Promise.all([
    getSetting<number>("security.maxFailedAttempts"),
    getSetting<number>("security.lockMinutes"),
    getSetting<number>("security.sessionHours"),
    getSetting<boolean>("security.require2fa"),
  ]);

  if (profile.lockedUntil && profile.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((profile.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`O acesso está bloqueado por segurança. Tente de novo daqui a ${minutes} minuto(s).`);
  }

  let method = "SEM_2FA";
  const patch: any = { failedAttempts: 0, lastLoginAt: new Date() };

  if (profile.twoFactorEnabled) {
    const check = await checkCode(profile, code);

    if (!check.ok) {
      const failed = profile.failedAttempts + 1;

      if (failed >= maxFailed) {
        await prisma.adminProfile.update({
          where: { userId: adminId },
          data: { failedAttempts: 0, lockedUntil: new Date(Date.now() + lockMinutes * 60000) },
        });
        forgetAdminCache(adminId);

        await logSecurity(adminId, "LOCKED", "ALERTA", `Acesso bloqueado por ${maxFailed} códigos errados.`, info);
        const user = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
        const supers = (await activeSuperIds()).filter((id) => id !== adminId);
        await notifyAdminsWith(supers, "Acesso de administrador bloqueado", `${user?.name ?? "Um administrador"} errou o código ${maxFailed} vezes.`, adminId);

        throw new Error(`Código errado demasiadas vezes. O acesso ficou bloqueado por ${lockMinutes} minutos.`);
      }

      await prisma.adminProfile.update({ where: { userId: adminId }, data: { failedAttempts: failed } });
      await logSecurity(adminId, "LOGIN_FAIL", "INFO", "Código errado ao confirmar o acesso.", info);
      throw new Error(`Código inválido. Tem mais ${maxFailed - failed} tentativa(s).`);
    }

    method = check.usedBackup ? "CODIGO_RESERVA" : "2FA";
    if (check.usedBackup) {
      const hash = sha256(normalizeBackup(String(code)));
      patch.backupCodes = (profile.backupCodes as string[]).filter((h) => h !== hash);
    }
  } else if (require2fa) {
    throw new Error("A plataforma exige a autenticação de dois fatores. Ative-a primeiro.");
  }

  // Dispositivo novo: nunca usou este telemóvel ou navegador nos últimos 30 dias
  const [known, anySession] = await Promise.all([
    info.userAgent
      ? prisma.adminSession.findFirst({ where: { adminId, userAgent: info.userAgent, createdAt: { gte: new Date(Date.now() - 30 * DAY) } } })
      : Promise.resolve(null),
    prisma.adminSession.findFirst({ where: { adminId } }),
  ]);
  if (!known && anySession) {
    await logSecurity(adminId, "NEW_DEVICE", "ALERTA", "Acesso a partir de um dispositivo novo.", info);
  }

  // No máximo 5 sessões abertas: termina as mais antigas
  const open = await prisma.adminSession.findMany({
    where: { adminId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });
  if (open.length >= MAX_SESSIONS) {
    await prisma.adminSession.updateMany({
      where: { id: { in: open.slice(0, open.length - MAX_SESSIONS + 1).map((s) => s.id) } },
      data: { revokedAt: new Date() },
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionHours * 3600000);
  const session = await prisma.adminSession.create({
    data: { adminId, tokenHash: sha256(token), method, ip: info.ip, userAgent: info.userAgent, expiresAt },
  });

  await prisma.adminProfile.update({ where: { userId: adminId }, data: patch });
  forgetAdminCache(adminId);
  await logSecurity(adminId, "LOGIN_OK", "INFO", `Acesso confirmado (${method === "SEM_2FA" ? "sem 2FA" : method === "2FA" ? "com 2FA" : "código de reserva"}).`, info);

  return {
    token,
    sessionId: session.id,
    expiresAt,
    method,
    twoFactorEnabled: profile.twoFactorEnabled,
    backupCodesLeft: patch.backupCodes ? patch.backupCodes.length : profile.backupCodes.length,
  };
}

export async function endSession(adminId: string, sessionId: string | null, info: ClientInfo) {
  if (!sessionId) return { ended: true };

  await prisma.adminSession.updateMany({ where: { id: sessionId, adminId, revokedAt: null }, data: { revokedAt: new Date() } });
  await logSecurity(adminId, "SESSION_ENDED", "INFO", "Sessão terminada.", info);
  return { ended: true };
}

export async function sessionStatus(admin: AdminSnapshot, sessionId: string | null) {
  const session = sessionId ? await prisma.adminSession.findUnique({ where: { id: sessionId } }) : null;
  const require2fa = await getSetting<boolean>("security.require2fa");

  return {
    required: !!admin.profile?.twoFactorEnabled || require2fa,
    twoFactorEnabled: !!admin.profile?.twoFactorEnabled,
    hasSession: !!session,
    expiresAt: session?.expiresAt ?? null,
    locked: !!admin.profile?.lockedUntil && admin.profile.lockedUntil.getTime() > Date.now(),
    lockedUntil: admin.profile?.lockedUntil ?? null,
  };
}

function shapeSession(s: any, currentId: string | null) {
  const now = Date.now();
  return {
    id: s.id,
    method: s.method,
    ip: s.ip,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    expiresAt: s.expiresAt,
    revokedAt: s.revokedAt,
    active: !s.revokedAt && new Date(s.expiresAt).getTime() > now,
    isCurrent: s.id === currentId,
  };
}

export async function listSessions(adminId: string, currentId: string | null) {
  const rows = await prisma.adminSession.findMany({ where: { adminId }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((s) => shapeSession(s, currentId));
}

export async function revokeSession(actor: AdminSnapshot, sessionId: string, info: ClientInfo) {
  const session = await prisma.adminSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new Error("Sessão não encontrada.");
  }
  if (session.adminId !== actor.userId && !actor.permissions.has("security.manage")) {
    throw new Error("Só pode terminar as suas próprias sessões.");
  }

  await prisma.adminSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  await logSecurity(session.adminId, "SESSION_REVOKED", "INFO", "Sessão revogada.", info);
  if (session.adminId !== actor.userId) {
    await logAudit(actor.userId, "SECURITY_SESSION_REVOKE", { type: "ADMIN", id: session.adminId }, "Terminou uma sessão de outro administrador");
  }
  return { id: sessionId, revoked: true };
}

export async function revokeAllSessions(actor: AdminSnapshot, targetId: string, info: ClientInfo) {
  const result = await prisma.adminSession.updateMany({ where: { adminId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });

  await logSecurity(targetId, "SESSION_REVOKED", "ALERTA", `Todas as sessões foram terminadas (${result.count}).`, info);
  await logAudit(actor.userId, "SECURITY_SESSION_REVOKE", { type: "ADMIN", id: targetId }, `Terminou todas as sessões (${result.count})`);
  return { count: result.count };
}

// =====================================================================
// A minha segurança
// =====================================================================
export async function getMySecurity(admin: AdminSnapshot, currentSessionId: string | null) {
  const profile = await ensureAdminProfile(admin.userId);
  const [sessions, events, require2fa] = await Promise.all([
    listSessions(admin.userId, currentSessionId),
    prisma.adminSecurityEvent.findMany({ where: { adminId: admin.userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    getSetting<boolean>("security.require2fa"),
  ]);

  return {
    level: admin.level,
    legacy: admin.legacy,
    twoFactorEnabled: profile.twoFactorEnabled,
    setupStarted: !profile.twoFactorEnabled && !!profile.twoFactorSecret,
    backupCodesLeft: profile.backupCodes.length,
    require2fa,
    lockedUntil: profile.lockedUntil && profile.lockedUntil.getTime() > Date.now() ? profile.lockedUntil : null,
    lastLoginAt: profile.lastLoginAt,
    sessions,
    events,
  };
}

// =====================================================================
// Para quem gere a segurança: desbloquear e repor o 2FA
// =====================================================================
export async function unlockAdmin(actor: AdminSnapshot, targetId: string, info: ClientInfo) {
  const profile = await prisma.adminProfile.findUnique({ where: { userId: targetId } });
  if (!profile) {
    throw new Error("Administrador não encontrado.");
  }

  await prisma.adminProfile.update({ where: { userId: targetId }, data: { lockedUntil: null, failedAttempts: 0 } });
  forgetAdminCache(targetId);

  await logSecurity(targetId, "UNLOCKED", "INFO", "Acesso desbloqueado.", info);
  await logAudit(actor.userId, "SECURITY_UNLOCK", { type: "ADMIN", id: targetId }, "Desbloqueou o acesso de um administrador");
  return { userId: targetId, unlocked: true };
}

// Para quem perdeu o telemóvel: apaga o 2FA e termina as sessões. A pessoa tem de o ativar de novo.
export async function resetTwoFactor(actor: AdminSnapshot, targetId: string, info: ClientInfo) {
  if (targetId === actor.userId) {
    throw new Error("Para a sua conta, desative o 2FA com um código.");
  }
  const profile = await prisma.adminProfile.findUnique({ where: { userId: targetId } });
  if (!profile) {
    throw new Error("Administrador não encontrado.");
  }

  await prisma.adminProfile.update({
    where: { userId: targetId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [], failedAttempts: 0, lockedUntil: null },
  });
  await prisma.adminSession.updateMany({ where: { adminId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });
  forgetAdminCache(targetId);

  await logSecurity(targetId, "TWO_FACTOR_RESET", "ALERTA", "Autenticação de dois fatores reposta por outro administrador.", info);
  await logAudit(actor.userId, "SECURITY_2FA_RESET", { type: "ADMIN", id: targetId }, "Repôs a autenticação de dois fatores de um administrador");
  await notifyAdminsWith([targetId], "A sua autenticação de dois fatores foi reposta", "Ative-a de novo na área de Segurança.", targetId);

  return { userId: targetId, reset: true };
}
