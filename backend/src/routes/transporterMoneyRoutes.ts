import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  moneyCatalog,
  payouts,
  payoutConfirm,
  payoutContest,
  expenses,
  expenseCreate,
  expenseUpdate,
  expenseDelete,
  partyRate,
  parties,
  complaints,
} from "../controllers/transporterMoneyController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog/money", moneyCatalog);

// Pagamentos recebidos e pendentes
router.get("/payouts", payouts);
router.post("/payouts/:id/confirm", payoutConfirm);
router.post("/payouts/:id/contest", payoutContest);

// Despesas do veículo
router.get("/expenses", expenses);
router.post("/expenses", expenseCreate);
router.put("/expenses/:id", expenseUpdate);
router.delete("/expenses/:id", expenseDelete);

// Avaliar compradores e vendedores, e reclamações recebidas
router.post("/ratings/party", partyRate);
router.get("/deliveries/:id/parties", parties);
router.get("/complaints", complaints);

export default router;
