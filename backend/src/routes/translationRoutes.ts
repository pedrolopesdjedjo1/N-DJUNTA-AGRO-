import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { isAdmin } from "../middleware/isAdmin";
import { list, upsert, setMyLanguage } from "../controllers/translationController";

const router = Router();

// Ver as traduções não exige login (o app carrega isso ao abrir)
router.get("/", list);

// Cadastrar/corrigir uma tradução é só para o admin
router.post("/", authMiddleware, isAdmin, upsert);

// Trocar o idioma preferido exige estar logado
router.patch("/my-language", authMiddleware, setMyLanguage);

export default router;
