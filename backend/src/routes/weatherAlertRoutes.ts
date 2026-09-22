import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, list, remove } from "../controllers/weatherAlertController";

const router = Router();

// Ver alertas não exige login - informação importante para todos
router.get("/", list);

// Criar e remover exigem login (o controller confere o perfil)
router.post("/", authMiddleware, create);
router.delete("/:id", authMiddleware, remove);

export default router;
