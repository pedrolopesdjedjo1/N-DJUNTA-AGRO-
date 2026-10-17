import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  funding,
  newFunding,
  editFunding,
  removeFunding,
  expenses,
  newExpense,
  removeExpense,
  report,
  partners,
  partner,
  newPartner,
  editPartner,
  removePartner,
  partnersOfProject,
  link,
  unlink,
} from "../controllers/ngoFinanceController";

const router = Router();

router.use(authMiddleware);

router.get("/funding", funding);
router.post("/funding", newFunding);
router.put("/funding/:id", editFunding);
router.delete("/funding/:id", removeFunding);

router.get("/expenses", expenses);
router.post("/expenses", newExpense);
router.delete("/expenses/:id", removeExpense);

router.get("/finance/report", report);

router.get("/partners", partners);
router.post("/partners", newPartner);
router.get("/partners/:id", partner);
router.put("/partners/:id", editPartner);
router.delete("/partners/:id", removePartner);

router.get("/projects/:id/partners", partnersOfProject);
router.post("/projects/:id/partners", link);
router.delete("/projects/:id/partners/:partnerId", unlink);

export default router;
