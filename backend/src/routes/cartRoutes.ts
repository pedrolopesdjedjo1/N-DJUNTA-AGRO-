import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { cart, count, add, setQuantity, remove, clear, options, placeOrder } from "../controllers/cartController";

const router = Router();

router.use(authMiddleware);

router.get("/cart", cart);
router.get("/cart/count", count);
router.post("/cart", add);
router.delete("/cart", clear);
router.patch("/cart/:productId", setQuantity);
router.delete("/cart/:productId", remove);

router.get("/checkout/options", options);
router.post("/checkout", placeOrder);

export default router;
