import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { isAdmin } from "../middleware/isAdmin";
import { get, update } from "../controllers/platformSettingsController";

const router = Router();

// Ver a taxa atual não exige login - transparência para todos
router.get("/", get);

// Só o admin pode mudar a taxa
router.patch("/", authMiddleware, isAdmin, update);

export default router;
