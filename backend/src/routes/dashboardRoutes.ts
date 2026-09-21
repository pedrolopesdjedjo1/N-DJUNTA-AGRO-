import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { overview, growth } from "../controllers/dashboardController";

const router = Router();

// Exige login - o controller confere se o perfil tem permissão
router.use(authMiddleware);

router.get("/overview", overview);
router.get("/growth", growth);

export default router;
