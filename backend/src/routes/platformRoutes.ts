import { Router } from "express";
import { catalog, reportCreate, reportsMine, identityCreate, identityMine } from "../controllers/platformController";

// Rotas para todas as pessoas com conta (não só administradores).
// O authMiddleware entra no server.ts: app.use("/api/platform", authMiddleware, platformRoutes)
const router = Router();

router.get("/catalog", catalog);

router.post("/reports", reportCreate);
router.get("/reports/mine", reportsMine);

router.post("/identity", identityCreate);
router.get("/identity/mine", identityMine);

export default router;
