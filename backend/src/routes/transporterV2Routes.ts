import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { start, arrive, combine, vehicleStatus } from "../controllers/transporterV2Controller";

const router = Router();

router.use(authMiddleware);

router.post("/deliveries/:id/start", start);
router.post("/deliveries/:id/arrive", arrive);
router.get("/deliveries/:id/combine", combine);
router.patch("/vehicle/status", vehicleStatus);

export default router;
