import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  dashboard,
  sold,
  bestSelling,
  payments,
  reviews,
  profile,
  putProfile,
  market,
  compare,
} from "../controllers/artisanController";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", dashboard);
router.post("/products/:id/sold", sold);
router.get("/best-selling", bestSelling);
router.get("/payments", payments);
router.get("/reviews", reviews);
router.get("/profile", profile);
router.put("/profile", putProfile);
router.get("/market", market);
router.get("/market/compare", compare);

export default router;
