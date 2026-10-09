import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  create,
  list,
  one,
  setStatus,
  markPaid,
  transporters,
  askDelivery,
  deliveries,
  setDeliveryStatus,
} from "../controllers/orderController";

const router = Router();

router.use(authMiddleware);

router.post("/", create);
router.get("/", list);
router.get("/transporters", transporters);
router.get("/deliveries", deliveries);
router.patch("/deliveries/:deliveryId/status", setDeliveryStatus);
router.get("/:id", one);
router.patch("/:id/status", setStatus);
router.patch("/:id/paid", markPaid);
router.post("/:id/delivery", askDelivery);

export default router;
