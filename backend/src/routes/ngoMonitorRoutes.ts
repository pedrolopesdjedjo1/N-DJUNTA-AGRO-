import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { home, monitoring, report, map } from "../controllers/ngoMonitorController";

const router = Router();

router.use(authMiddleware);

router.get("/home", home);
router.get("/monitoring", monitoring);
router.get("/reports", report);
router.get("/map", map);

export default router;
