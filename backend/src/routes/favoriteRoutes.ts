import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { add, remove, list } from "../controllers/favoriteController";

const router = Router();

// Todas as rotas de favoritos exigem login
router.use(authMiddleware);

router.get("/", list);
router.post("/", add);
router.delete("/:productId", remove);

export default router;
