import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { forecast, regions } from "../controllers/weatherController";

const router = Router();

router.use(authMiddleware);

router.get("/forecast", forecast);
router.get("/regions", regions);

export default router;
