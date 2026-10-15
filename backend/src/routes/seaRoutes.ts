import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { conditions, zones } from "../controllers/seaController";

const router = Router();

router.use(authMiddleware);

router.get("/conditions", conditions);
router.get("/zones", zones);

export default router;
