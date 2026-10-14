import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { list, create, remove } from "../controllers/contactController";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.post("/", create);
router.delete("/:id", remove);

export default router;
