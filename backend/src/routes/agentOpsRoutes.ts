import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  opsCatalog,
  market,
  marketOne,
  marketClient,
  marketSuggest,
  orders,
  orderOne,
  orderLog,
  transporters,
  deliveries,
  deliveryOne,
  cases,
  caseCreate,
  caseOne,
  caseNote,
  caseStatus,
  caseEscalate,
  caseRemove,
  adminCases,
  adminCaseOne,
  adminCaseRespond,
} from "../controllers/agentOpsController";

const router = Router();

router.use(authMiddleware);

router.get("/ops-catalog", opsCatalog);

// Mercado (rotas fixas primeiro, antes de /:id)
router.get("/market", market);
router.post("/market/suggest", marketSuggest);
router.get("/market/clients/:linkId", marketClient);
router.get("/market/:id", marketOne);

// Encomendas
router.get("/orders", orders);
router.get("/orders/:id", orderOne);
router.post("/orders/:id/log", orderLog);

// Transporte
router.get("/transporters", transporters);
router.get("/deliveries", deliveries);
router.get("/deliveries/:id", deliveryOne);

// Chamados
router.get("/cases", cases);
router.post("/cases", caseCreate);
router.get("/cases/:id", caseOne);
router.post("/cases/:id/notes", caseNote);
router.patch("/cases/:id/status", caseStatus);
router.post("/cases/:id/escalate", caseEscalate);
router.delete("/cases/:id", caseRemove);

// Equipa do app
router.get("/admin/cases", adminCases);
router.get("/admin/cases/:id", adminCaseOne);
router.post("/admin/cases/:id/respond", adminCaseRespond);

export default router;
