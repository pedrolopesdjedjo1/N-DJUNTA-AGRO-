import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import * as c from "../controllers/backofficeFinanceController";

// A autenticação e o adminContext entram no server.ts, antes destas rotas
const router = Router();

router.get("/catalog/finance", c.financeCatalog);

router.get("/finance/overview", requirePermission("finance.view"), c.overview);
router.get("/finance/sales", requirePermission("finance.view", "stats.view"), c.sales);
router.get("/finance/payments", requirePermission("finance.view"), c.payments);
router.get("/finance/transactions", requirePermission("finance.view"), c.transactions);
router.get("/finance/report", requirePermission("finance.view", "stats.view"), c.report);

// Comissões dos agentes
router.get("/finance/commissions", requirePermission("finance.view"), c.commissions);
router.post("/finance/commissions/pay", requirePermission("finance.manage"), c.commissionsPay);
router.get("/finance/commissions/:agentId", requirePermission("finance.view"), c.commissionRows);
router.post("/finance/commissions/:id/void", requirePermission("finance.manage"), c.commissionVoid);

// Reembolsos (rotas fixas primeiro, antes de /:id)
router.get("/finance/refunds", requirePermission("finance.view"), c.refunds);
router.get("/finance/refunds/candidates", requirePermission("finance.view"), c.refundCandidates);
router.post("/finance/refunds", requirePermission("finance.manage"), c.refundCreate);
router.get("/finance/refunds/:id", requirePermission("finance.view"), c.refundOne);
router.post("/finance/refunds/:id/decide", requirePermission("finance.manage"), c.refundDecide);
router.post("/finance/refunds/:id/pay", requirePermission("finance.manage"), c.refundPay);

// Alertas de transações suspeitas
router.get("/finance/flags", requirePermission("finance.view"), c.flags);
router.post("/finance/flags/review", requirePermission("finance.manage"), c.flagReview);

export default router;
