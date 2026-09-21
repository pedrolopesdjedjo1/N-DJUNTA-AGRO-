import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { isAdmin } from "../middleware/isAdmin";
import {
  stats,
  users,
  setUserActive,
  products,
  deleteProduct,
} from "../controllers/adminController";

const router = Router();

// Todas as rotas do admin exigem login E ser administrador
router.use(authMiddleware, isAdmin);

router.get("/stats", stats);
router.get("/users", users);
router.patch("/users/:userId/active", setUserActive);
router.get("/products", products);
router.delete("/products/:productId", deleteProduct);

export default router;
