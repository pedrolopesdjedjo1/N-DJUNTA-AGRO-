import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as c from "../controllers/transporterController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog", c.catalog);
router.get("/home", c.home);
router.get("/earnings", c.earnings);
router.get("/ratings", c.ratings);

router.get("/profile", c.profile);
router.put("/profile", c.saveMyProfile);
router.put("/availability", c.availability);

// As rotas fixas vêm antes de "/deliveries/:id"
router.get("/deliveries/available", c.available);
router.get("/deliveries/mine", c.mine);
router.get("/deliveries/:id", c.one);
router.post("/deliveries/:id/accept", c.accept);
router.post("/deliveries/:id/decline", c.decline);
router.post("/deliveries/:id/release", c.release);
router.post("/deliveries/:id/collect", c.collect);
router.post("/deliveries/:id/deliver", c.deliver);
router.post("/deliveries/:id/location", c.location);
router.post("/deliveries/:id/problem", c.problem);

export default router;
