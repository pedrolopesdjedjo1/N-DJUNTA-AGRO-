import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { list, unreadCount, read, readAll, remove } from "../controllers/notificationController";

const router = Router();

router.use(authMiddleware);

// As rotas fixas vêm antes das que têm :id, para não serem confundidas com um id
router.get("/", list);
router.get("/unread-count", unreadCount);
router.patch("/read-all", readAll);
router.patch("/:id/read", read);
router.delete("/:id", remove);

export default router;
