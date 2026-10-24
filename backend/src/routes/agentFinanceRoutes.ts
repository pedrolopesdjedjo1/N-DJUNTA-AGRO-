import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  financeCatalog,
  earnings,
  commissions,
  payments,
  report,
  map,
  security,
  lock,
  securityReportCreate,
  securityReportMine,
  adminCommissions,
  adminCommissionList,
  adminPay,
  adminVoid,
  adminReconcileAgent,
  adminUnlockAgent,
  adminDetail,
  adminSignalList,
  adminSecurityReports,
  adminSecurityRespond,
} from "../controllers/agentFinanceController";

const router = Router();

router.use(authMiddleware);

router.get("/finance-catalog", financeCatalog);

// Ganhos e relatórios
router.get("/earnings", earnings);
router.get("/commissions", commissions);
router.get("/payments", payments);
router.get("/report", report);

// Mapa
router.get("/map", map);

// Segurança
router.get("/security", security);
router.post("/security/lock", lock);
router.get("/security-reports", securityReportMine);
router.post("/security-reports", securityReportCreate);

// Equipa do app
router.get("/admin/commissions", adminCommissions);
router.get("/admin/commissions/list", adminCommissionList);
router.post("/admin/commissions/pay", adminPay);
router.post("/admin/commissions/:id/void", adminVoid);
router.get("/admin/agents/:userId/detail", adminDetail);
router.post("/admin/agents/:userId/reconcile", adminReconcileAgent);
router.post("/admin/agents/:userId/unlock", adminUnlockAgent);
router.get("/admin/signals", adminSignalList);
router.get("/admin/security-reports", adminSecurityReports);
router.post("/admin/security-reports/:id/respond", adminSecurityRespond);

export default router;
