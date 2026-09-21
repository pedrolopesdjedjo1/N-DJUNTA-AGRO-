import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { isAdmin } from "../middleware/isAdmin";
import { create, list, updateStatus } from "../controllers/reportController";

const router = Router();

// Qualquer usuário logado pode denunciar
router.post("/", authMiddleware, create);

// Só o admin pode ver e revisar denúncias
router.get("/", authMiddleware, isAdmin, list);
router.patch("/:id/status", authMiddleware, isAdmin, updateStatus);

export default router;
