import { Router } from "express";
import { proof } from "../controllers/transporterV2Controller";

// Para todas as pessoas com conta. Entra junto com as outras de /api/platform:
// app.use("/api/platform", authMiddleware, platformRoutes, platformOpsRoutes, platformContentRoutes, platformFeedRoutes, platformTransportRoutes)
const router = Router();

router.get("/deliveries/:orderId/proof", proof);

export default router;
