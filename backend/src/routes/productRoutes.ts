import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, list, getOne, update, remove } from "../controllers/productController";

const router = Router();

// Ver produtos não exige login (compradores podem navegar livremente)
router.get("/", list);
router.get("/:id", getOne);

// Criar, editar e excluir exigem login
router.post("/", authMiddleware, create);
router.put("/:id", authMiddleware, update);
router.delete("/:id", authMiddleware, remove);

export default router;
