import { Router } from "express";
import { categories, featured, disputeReasons, disputeCreate, disputesMine, disputeOne, disputeReply } from "../controllers/platformOpsController";

// Rotas para todas as pessoas com conta. Entram junto com as outras de /api/platform:
// app.use("/api/platform", authMiddleware, platformRoutes, platformOpsRoutes)
const router = Router();

router.get("/categories", categories);
router.get("/featured", featured);

router.get("/dispute-reasons", disputeReasons);
router.post("/disputes", disputeCreate);
router.get("/disputes/mine", disputesMine);
router.get("/disputes/:id", disputeOne);
router.post("/disputes/:id/reply", disputeReply);

export default router;
