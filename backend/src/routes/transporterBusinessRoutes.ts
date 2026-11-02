import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as c from "../controllers/transporterBusinessController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog/business", c.businessCatalog);

// Pagamentos, despesas e relatório financeiro
router.get("/payments", c.payments);
router.post("/payments/:id/confirm", c.payoutConfirm);
router.post("/payments/:id/contest", c.payoutContest);
router.get("/expenses", c.expenses);
router.post("/expenses", c.expenseAdd);
router.delete("/expenses/:id", c.expenseDelete);
router.get("/finance/report", c.financeReport);

// Reputação
router.get("/reputation", c.reputationMine);
router.get("/reputation/to-rate", c.toRate);
router.post("/deliveries/:id/rate", c.rateParty);
router.get("/parties/:userId/reputation", c.partyReputation);
router.get("/complaints", c.complaints);

// Contactos
router.get("/contacts", c.contactList);
router.post("/contacts/log", c.contactLog);
router.get("/contacts/:userId/history", c.contactHistory);
router.get("/directory", c.directory);

// Ofertas de transporte e pedidos recebidos
router.get("/offers", c.offerList);
router.post("/offers", c.offerCreate);
router.put("/offers/:id", c.offerUpdate);
router.post("/offers/:id/close", c.offerClose);
router.get("/requests", c.requestList);
router.post("/requests/:id/respond", c.requestRespond);

export default router;
