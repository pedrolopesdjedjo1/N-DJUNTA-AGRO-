import { Router } from "express";
import { hidden, coopStatus, refundsMine } from "../controllers/platformContentController";

// Rotas para todas as pessoas com conta. Entram junto com as outras de /api/platform:
// app.use("/api/platform", authMiddleware, platformRoutes, platformOpsRoutes, platformContentRoutes)
const router = Router();

router.get("/hidden", hidden);
router.get("/coops/:id/status", coopStatus);
router.get("/refunds/mine", refundsMine);

export default router;
