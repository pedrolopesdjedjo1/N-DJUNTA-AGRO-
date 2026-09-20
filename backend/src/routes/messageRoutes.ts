import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { send, conversation, myConversations, read } from "../controllers/messageController";

const router = Router();

// Todas as rotas de mensagem exigem login
router.use(authMiddleware);

router.post("/", send);
router.get("/", myConversations);
router.get("/with/:otherUserId", conversation);
router.patch("/:id/read", read);

export default router;
