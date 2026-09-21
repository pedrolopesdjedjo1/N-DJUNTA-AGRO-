import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, list, update, remove } from "../controllers/transportController";

const router = Router();

// Ver ofertas de transporte não exige login
router.get("/", list);

// Criar, editar e excluir exigem login
router.post("/", authMiddleware, create);
router.put("/:id", authMiddleware, update);
router.delete("/:id", authMiddleware, remove);

export default router;
