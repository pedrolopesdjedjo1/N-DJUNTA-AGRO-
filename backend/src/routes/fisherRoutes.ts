import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  dashboard,
  catches,
  newCatch,
  editCatch,
  soldCatch,
  removeCatch,
  publish,
  prices,
  profile,
  putProfile,
  cooperative,
} from "../controllers/fisherController";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", dashboard);
router.get("/catches", catches);
router.post("/catches", newCatch);
router.patch("/catches/:id", editCatch);
router.post("/catches/:id/sold", soldCatch);
router.post("/catches/:id/publish", publish);
router.delete("/catches/:id", removeCatch);
router.get("/prices", prices);
router.get("/profile", profile);
router.put("/profile", putProfile);
router.get("/cooperatives/:id", cooperative);

export default router;
