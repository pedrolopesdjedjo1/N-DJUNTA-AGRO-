import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { list, one, mine, create, update, remove } from "../controllers/publicationController";

const router = Router();

router.use(authMiddleware);

router.get("/mine", mine);
router.get("/", list);
router.post("/", create);
router.get("/:id", one);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
