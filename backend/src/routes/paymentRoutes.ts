import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, list, confirm, cancel } from "../controllers/paymentController";

const router = Router();

// Todas as rotas de pagamento exigem login
router.use(authMiddleware);

router.post("/", create);
router.get("/", list);
router.patch("/:id/confirm", confirm);
router.patch("/:id/cancel", cancel);

export default router;
