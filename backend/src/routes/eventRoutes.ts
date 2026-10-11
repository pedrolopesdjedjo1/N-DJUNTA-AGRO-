import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { list, mine, one, create, remove, register, registrations } from "../controllers/eventController";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.get("/mine", mine);
router.post("/", create);
router.get("/:id", one);
router.delete("/:id", remove);
router.post("/:id/register", register);
router.get("/:id/registrations", registrations);

export default router;
