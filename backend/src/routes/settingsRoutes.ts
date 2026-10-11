import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { get, put, password, phone } from "../controllers/settingsController";

const router = Router();

router.use(authMiddleware);

router.get("/", get);
router.put("/", put);
router.patch("/password", password);
router.patch("/phone", phone);

export default router;
