import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { list, read, readAll, unreadCount } from "../controllers/notificationController";

const router = Router();

// Todas as rotas de notificação exigem login
router.use(authMiddleware);

router.get("/", list);
router.get("/unread-count", unreadCount);
router.patch("/:id/read", read);
router.patch("/read-all", readAll);

export default router;
