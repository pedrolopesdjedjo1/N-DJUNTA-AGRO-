import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { isAdmin } from "../middleware/isAdmin";
import { request, list, review } from "../controllers/verificationController";

const router = Router();

// Qualquer usuário logado pode pedir verificação
router.post("/", authMiddleware, request);

// Só o admin pode ver e revisar pedidos
router.get("/", authMiddleware, isAdmin, list);
router.patch("/:id/review", authMiddleware, isAdmin, review);

export default router;
