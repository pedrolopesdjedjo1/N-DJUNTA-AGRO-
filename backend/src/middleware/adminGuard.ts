import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { AdminSnapshot, loadAdmin } from "../services/adminAccess";
import { findSession } from "../services/adminSecurityService";
import { getSetting } from "../lib/platformSettings";

export interface AdminRequest extends AuthRequest {
  admin?: AdminSnapshot & { sessionId: string | null };
}

// Caminhos que se podem usar antes de confirmar o acesso com o código
const OPEN_PATHS = ["/session/start", "/session/status", "/security/2fa/setup", "/security/2fa/enable"];

// Põe-se no server.ts depois do authMiddleware: só deixa passar administradores ativos.
// Usa 403 (e não 401) para o app não terminar a sessão normal da pessoa.
export async function adminContext(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Sessão inválida." });
    }

    const snap = await loadAdmin(req.userId);
    if (!snap) {
      return res.status(403).json({ error: "Acesso restrito à equipa do NÔDJUNTA AGRO.", code: "NOT_ADMIN" });
    }
    if (!snap.active || snap.status === "SUSPENSO") {
      return res.status(403).json({ error: "O seu acesso de administrador está suspenso.", code: "ADMIN_SUSPENDED" });
    }

    const open = OPEN_PATHS.includes(req.path);
    const twoFactor = !!snap.profile?.twoFactorEnabled;
    const required = twoFactor || (await getSetting<boolean>("security.require2fa"));

    let sessionId: string | null = null;
    const header = req.headers["x-admin-session"];
    if (typeof header === "string" && header) {
      const session = await findSession(snap.userId, header);
      if (session) sessionId = session.id;
    }

    if (required && !open) {
      if (!twoFactor) {
        return res.status(403).json({ error: "Ative a autenticação de dois fatores para usar a área de administração.", code: "ADMIN_2FA_REQUIRED" });
      }
      if (!sessionId) {
        return res.status(403).json({ error: "Confirme o seu acesso de administrador com o código.", code: "ADMIN_SESSION_REQUIRED" });
      }
    }

    req.admin = { ...snap, sessionId };
    return next();
  } catch (error) {
    console.error("adminContext", error);
    return res.status(503).json({ error: "Não foi possível validar o acesso de administrador." });
  }
}

// Deixa passar quem tiver pelo menos uma destas permissões
export function requirePermission(...perms: string[]) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    const admin = req.admin;
    if (admin && perms.some((p) => admin.permissions.has(p))) {
      return next();
    }
    return res.status(403).json({ error: "Não tem permissão para esta ação.", code: "FORBIDDEN" });
  };
}
