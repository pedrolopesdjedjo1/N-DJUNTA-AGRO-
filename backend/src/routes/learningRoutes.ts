import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { list, one, create, remove } from "../controllers/learningController";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.post("/", create);
router.get("/:id", one);
router.delete("/:id", remove);

export default router;
