import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { regions, list, mine, one, create, update, end, remove } from "../controllers/govAlertController";

const router = Router();

router.use(authMiddleware);

router.get("/regions", regions);

// Rotas fixas primeiro (antes de /:id)
router.get("/alerts/mine", mine);
router.get("/alerts", list);
router.post("/alerts", create);
router.get("/alerts/:id", one);
router.put("/alerts/:id", update);
router.post("/alerts/:id/end", end);
router.delete("/alerts/:id", remove);

export default router;
