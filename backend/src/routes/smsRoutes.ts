import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { isAdmin } from "../middleware/isAdmin";
import { incoming, logs } from "../controllers/smsController";

const router = Router();

// Rota pública (será chamada pelo gateway de SMS no futuro)
router.post("/incoming", incoming);

// Histórico de SMS é só para o admin
router.get("/logs", authMiddleware, isAdmin, logs);

export default router;
