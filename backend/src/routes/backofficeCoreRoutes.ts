import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import {
  catalog,
  me,
  sessionStart,
  sessionState,
  sessionEnd,
  security,
  twoFactorSetup,
  twoFactorEnable,
  twoFactorDisable,
  sessions,
  sessionRevoke,
  sessionsRevokeAll,
  unlock,
  resetFactor,
  securityEvents,
  audit,
  team,
  teamOne,
  teamPromote,
  teamUpdate,
  teamSuspend,
  teamReactivate,
  teamDemote,
  settings,
  settingUpdate,
} from "../controllers/adminCoreController";

// A autenticação e o adminContext entram no server.ts, antes de todas as rotas de /api/backoffice
const router = Router();

router.get("/catalog", catalog);
router.get("/me", me);

// Sessão de administrador
router.post("/session/start", sessionStart);
router.get("/session/status", sessionState);
router.post("/session/end", sessionEnd);

// A minha segurança
router.get("/security/me", security);
router.post("/security/2fa/setup", twoFactorSetup);
router.post("/security/2fa/enable", twoFactorEnable);
router.post("/security/2fa/disable", twoFactorDisable);
router.get("/security/sessions", sessions);
router.delete("/security/sessions/:id", sessionRevoke);
router.get("/security/events", securityEvents);

// Para quem gere a segurança
router.delete("/security/sessions-of/:userId", requirePermission("security.manage"), sessionsRevokeAll);
router.post("/security/unlock/:userId", requirePermission("security.manage"), unlock);
router.post("/security/reset-2fa/:userId", requirePermission("security.manage"), resetFactor);

// Registo de atividades (cada administrador vê a sua; quem tem permissão vê todas)
router.get("/audit", audit);

// Equipa (rotas fixas primeiro, antes de /:userId)
router.get("/team", requirePermission("team.manage"), team);
router.post("/team/promote", requirePermission("team.manage"), teamPromote);
router.get("/team/:userId", requirePermission("team.manage"), teamOne);
router.put("/team/:userId", requirePermission("team.manage"), teamUpdate);
router.post("/team/:userId/suspend", requirePermission("team.manage"), teamSuspend);
router.post("/team/:userId/reactivate", requirePermission("team.manage"), teamReactivate);
router.post("/team/:userId/demote", requirePermission("team.manage"), teamDemote);

// Configurações do sistema (cada configuração tem a sua própria permissão)
router.get("/settings", settings);
router.put("/settings/:key", settingUpdate);

export default router;
