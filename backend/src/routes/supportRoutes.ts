import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { create, mine, all, setStatus } from "../controllers/supportController";

const router = Router();

router.use(authMiddleware);

router.post("/tickets", create);
router.get("/tickets", mine);
router.get("/tickets/all", all);
router.patch("/tickets/:id/status", setStatus);

export default router;
