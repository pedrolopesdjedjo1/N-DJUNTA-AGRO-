import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, listForUser } from "../controllers/reviewController";

const router = Router();

// Ver avaliações de um usuário não exige login
router.get("/user/:userId", listForUser);

// Criar avaliação exige login
router.post("/", authMiddleware, create);

export default router;
