import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { cooperatives, posts, newPost, removePost } from "../controllers/communityController";

const router = Router();

router.use(authMiddleware);

router.get("/cooperatives", cooperatives);
router.get("/posts", posts);
router.post("/posts", newPost);
router.delete("/posts/:id", removePost);

export default router;
