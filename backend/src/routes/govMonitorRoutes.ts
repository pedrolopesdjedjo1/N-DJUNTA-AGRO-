import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { home, stats, map } from "../controllers/govMonitorController";

const router = Router();

router.use(authMiddleware);

router.get("/home", home);
router.get("/stats", stats);
router.get("/map", map);

export default router;
