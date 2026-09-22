import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, list, getOne, join, leave } from "../controllers/cooperativeController";

const router = Router();

// Ver cooperativas não exige login
router.get("/", list);
router.get("/:id", getOne);

// Criar, entrar e sair exigem login
router.post("/", authMiddleware, create);
router.post("/:id/join", authMiddleware, join);
router.delete("/:id/leave", authMiddleware, leave);

export default router;
