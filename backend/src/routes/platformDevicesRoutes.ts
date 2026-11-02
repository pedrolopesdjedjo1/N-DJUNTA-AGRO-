import { Router } from "express";
import { devicePing, deviceList, deviceRemove } from "../controllers/transporterToolsController";

// Para todas as pessoas com conta. Entra junto com as outras de /api/platform:
// app.use("/api/platform", authMiddleware, ..., platformOffersRoutes, platformDevicesRoutes)
const router = Router();

router.post("/devices/ping", devicePing);
router.get("/devices", deviceList);
router.delete("/devices/:id", deviceRemove);

export default router;
