import { Router } from "express";
import { alerts, banners, highlights, supportReplies, settings } from "../controllers/platformFeedController";

// Rotas para todas as pessoas com conta. Entram junto com as outras de /api/platform:
// app.use("/api/platform", authMiddleware, platformRoutes, platformOpsRoutes, platformContentRoutes, platformFeedRoutes)
const router = Router();

router.get("/alerts", alerts);
router.get("/banners", banners);
router.get("/highlights", highlights);
router.get("/support/replies", supportReplies);
router.get("/settings", settings);

export default router;
