import { Router } from "express";
import { getProfile } from "../controllers/profileController";

const router = Router();

// Perfil público não exige login - qualquer um pode ver
router.get("/:userId", getProfile);

export default router;
