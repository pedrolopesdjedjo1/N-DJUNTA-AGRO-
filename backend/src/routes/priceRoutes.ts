import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  prices,
  regions,
  compare,
  evolution,
  changes,
  wanted,
  materials,
  alerts,
  newAlert,
  removeAlert,
  check,
} from "../controllers/priceController";

const router = Router();

router.use(authMiddleware);

router.get("/", prices);
router.get("/regions", regions);
router.get("/compare", compare);
router.get("/history", evolution);
router.get("/movers", changes);
router.get("/most-wanted", wanted);
router.get("/materials", materials);
router.get("/alerts", alerts);
router.get("/alerts/check", check);
router.post("/alerts", newAlert);
router.delete("/alerts/:id", removeAlert);

export default router;
