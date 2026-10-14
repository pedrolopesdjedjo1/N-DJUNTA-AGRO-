import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { location, tracking, transporters } from "../controllers/trackingController";

const router = Router();

router.use(authMiddleware);

router.get("/transporters", transporters);
router.post("/deliveries/:id/location", location);
router.get("/deliveries/:id", tracking);

export default router;
