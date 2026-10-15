import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, mine, location, close, active, status } from "../controllers/sosController";

const router = Router();

router.use(authMiddleware);

router.post("/", create);
router.get("/mine", mine);
router.get("/active", active);
router.post("/:id/location", location);
router.patch("/:id/close", close);
router.patch("/:id/status", status);

export default router;
