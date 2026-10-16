import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  orders,
  order,
  cancel,
  received,
  paymentMethod,
  pay,
  payments,
  receipt,
  reviewables,
  review,
  mine,
  forProduct,
} from "../controllers/clientOrderController";

const router = Router();

router.use(authMiddleware);

router.get("/orders", orders);
router.get("/orders/:id", order);
router.post("/orders/:id/cancel", cancel);
router.post("/orders/:id/received", received);
router.patch("/orders/:id/payment-method", paymentMethod);
router.post("/orders/:id/pay", pay);
router.get("/orders/:id/receipt", receipt);
router.get("/orders/:id/reviews", reviewables);
router.post("/orders/:id/reviews", review);

router.get("/payments", payments);
router.get("/reviews/mine", mine);
router.get("/products/:id/reviews", forProduct);

export default router;
