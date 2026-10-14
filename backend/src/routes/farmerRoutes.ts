import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  dashboard,
  production,
  quantity,
  sold,
  profile,
  putProfile,
  cooperatives,
  cooperative,
} from "../controllers/farmerController";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", dashboard);
router.get("/production", production);
router.patch("/products/:id/quantity", quantity);
router.post("/products/:id/sold", sold);
router.get("/profile", profile);
router.put("/profile", putProfile);
router.get("/cooperatives", cooperatives);
router.get("/cooperatives/:id", cooperative);

export default router;
