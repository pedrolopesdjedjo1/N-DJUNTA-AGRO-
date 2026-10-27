import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import {
  usersCatalog,
  dashboard,
  users,
  userOne,
  userEdit,
  userSuspend,
  userBlock,
  userReactivate,
  userVerify,
  userUnverify,
  profilesSummary,
  profiles,
  identityList,
  identityOne,
  identityReview,
  reports,
  reportOne,
  reportAssign,
  reportNote,
  reportDecide,
} from "../controllers/backofficeUsersController";

// A autenticação e o adminContext entram no server.ts, antes destas rotas
const router = Router();

router.get("/catalog/users", usersCatalog);
router.get("/dashboard", requirePermission("dashboard.view"), dashboard);

// Utilizadores
router.get("/users", requirePermission("users.view"), users);
router.get("/users/:id", requirePermission("users.view"), userOne);
router.put("/users/:id", requirePermission("users.manage"), userEdit);
router.post("/users/:id/suspend", requirePermission("users.manage"), userSuspend);
router.post("/users/:id/block", requirePermission("users.manage"), userBlock);
router.post("/users/:id/reactivate", requirePermission("users.manage"), userReactivate);
router.post("/users/:id/verify", requirePermission("users.verify"), userVerify);
router.post("/users/:id/unverify", requirePermission("users.verify"), userUnverify);

// Perfis por tipo (rota fixa primeiro, antes de /:kind)
router.get("/profiles/summary", requirePermission("profiles.view"), profilesSummary);
router.get("/profiles/:kind", requirePermission("profiles.view"), profiles);

// Verificação de identidade
router.get("/identity", requirePermission("users.verify"), identityList);
router.get("/identity/:id", requirePermission("users.verify"), identityOne);
router.post("/identity/:id/review", requirePermission("users.verify"), identityReview);

// Denúncias e moderação
router.get("/reports", requirePermission("reports.view"), reports);
router.get("/reports/:id", requirePermission("reports.view"), reportOne);
router.post("/reports/:id/assign", requirePermission("reports.moderate"), reportAssign);
router.post("/reports/:id/note", requirePermission("reports.moderate"), reportNote);
router.post("/reports/:id/decide", requirePermission("reports.moderate"), reportDecide);

export default router;
