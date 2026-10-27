import { Response } from "express";
import { AdminRequest } from "../middleware/adminGuard";
import { adminCatalog, LEVEL_INFO } from "../lib/adminCatalog";
import { getSetting } from "../lib/platformSettings";
import {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  startSession,
  endSession,
  sessionStatus,
  listSessions,
  revokeSession,
  revokeAllSessions,
  getMySecurity,
  unlockAdmin,
  resetTwoFactor,
  ClientInfo,
} from "../services/adminSecurityService";
import { listAudit, listSecurityEvents } from "../services/adminAuditService";
import { listAdmins, getAdmin, promote, updateAdmin, suspendAdmin, reactivateAdmin, demoteAdmin } from "../services/adminTeamService";
import { listSettings, updateSetting } from "../services/adminSettingsService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

function info(req: AdminRequest): ClientInfo {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") || req.ip || null;
  return { ip, userAgent: String(req.headers["user-agent"] ?? "").slice(0, 200) || null };
}

export function catalog(req: AdminRequest, res: Response) {
  return res.status(200).json(adminCatalog());
}

// Quem sou eu como administrador
export function me(req: AdminRequest, res: Response) {
  return run(res, async () => {
    const a = req.admin!;
    const level = LEVEL_INFO.find((l) => l.value === a.level);
    return {
      userId: a.userId,
      name: a.name,
      level: a.level,
      levelLabel: level?.label ?? a.level,
      levelIcon: level?.icon ?? "🛡️",
      legacy: a.legacy,
      title: a.profile?.title ?? null,
      permissions: Array.from(a.permissions),
      twoFactorEnabled: !!a.profile?.twoFactorEnabled,
      hasSession: !!a.sessionId,
      platformName: await getSetting<string>("platform.name"),
    };
  });
}

// ---------- Sessão ----------
export function sessionStart(req: AdminRequest, res: Response) {
  return run(res, () => startSession(req.admin!.userId, req.body?.code, info(req)), 201);
}

export function sessionState(req: AdminRequest, res: Response) {
  return run(res, () => sessionStatus(req.admin!, req.admin!.sessionId));
}

export function sessionEnd(req: AdminRequest, res: Response) {
  return run(res, () => endSession(req.admin!.userId, req.admin!.sessionId, info(req)));
}

// ---------- Segurança ----------
export function security(req: AdminRequest, res: Response) {
  return run(res, () => getMySecurity(req.admin!, req.admin!.sessionId));
}

export function twoFactorSetup(req: AdminRequest, res: Response) {
  return run(res, () => setupTwoFactor(req.admin!.userId));
}

export function twoFactorEnable(req: AdminRequest, res: Response) {
  return run(res, () => enableTwoFactor(req.admin!.userId, req.body?.code, info(req)));
}

export function twoFactorDisable(req: AdminRequest, res: Response) {
  return run(res, () => disableTwoFactor(req.admin!.userId, req.body?.code, info(req)));
}

export function sessions(req: AdminRequest, res: Response) {
  return run(res, () => listSessions(req.admin!.userId, req.admin!.sessionId));
}

export function sessionRevoke(req: AdminRequest, res: Response) {
  return run(res, () => revokeSession(req.admin!, req.params.id, info(req)));
}

export function sessionsRevokeAll(req: AdminRequest, res: Response) {
  return run(res, () => revokeAllSessions(req.admin!, req.params.userId, info(req)));
}

export function unlock(req: AdminRequest, res: Response) {
  return run(res, () => unlockAdmin(req.admin!, req.params.userId, info(req)));
}

export function resetFactor(req: AdminRequest, res: Response) {
  return run(res, () => resetTwoFactor(req.admin!, req.params.userId, info(req)));
}

export function securityEvents(req: AdminRequest, res: Response) {
  return run(res, () =>
    listSecurityEvents(req.admin!, {
      adminId: str(req.query.adminId),
      severity: str(req.query.severity),
      kind: str(req.query.kind),
      page: num(req.query.page),
    })
  );
}

// ---------- Registo de atividades ----------
export function audit(req: AdminRequest, res: Response) {
  return run(res, () =>
    listAudit(req.admin!, {
      adminId: str(req.query.adminId),
      action: str(req.query.action),
      targetType: str(req.query.targetType),
      targetId: str(req.query.targetId),
      from: str(req.query.from),
      to: str(req.query.to),
      q: str(req.query.q),
      page: num(req.query.page),
    })
  );
}

// ---------- Equipa ----------
export function team(req: AdminRequest, res: Response) {
  return run(res, () => listAdmins({ q: str(req.query.q), level: str(req.query.level), status: str(req.query.status) }));
}

export function teamOne(req: AdminRequest, res: Response) {
  return run(res, () => getAdmin(req.params.userId), 200, 404);
}

export function teamPromote(req: AdminRequest, res: Response) {
  return run(res, () => promote(req.admin!, req.body), 201);
}

export function teamUpdate(req: AdminRequest, res: Response) {
  return run(res, () => updateAdmin(req.admin!, req.params.userId, req.body));
}

export function teamSuspend(req: AdminRequest, res: Response) {
  return run(res, () => suspendAdmin(req.admin!, req.params.userId, req.body?.note));
}

export function teamReactivate(req: AdminRequest, res: Response) {
  return run(res, () => reactivateAdmin(req.admin!, req.params.userId));
}

export function teamDemote(req: AdminRequest, res: Response) {
  return run(res, () => demoteAdmin(req.admin!, req.params.userId, req.body?.role));
}

// ---------- Configurações ----------
export function settings(req: AdminRequest, res: Response) {
  return run(res, () => listSettings(req.admin!));
}

export function settingUpdate(req: AdminRequest, res: Response) {
  return run(res, () => updateSetting(req.admin!, req.params.key, req.body?.value));
}
