import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  offers,
  methods,
  newMethod,
  editMethod,
  removeMethod,
  profile,
  putProfile,
  summary,
} from "../controllers/clientExtrasController";

const router = Router();

router.use(authMiddleware);

router.get("/offers", offers);
router.get("/summary", summary);
router.get("/profile", profile);
router.put("/profile", putProfile);

router.get("/payment-methods", methods);
router.post("/payment-methods", newMethod);
router.put("/payment-methods/:id", editMethod);
router.delete("/payment-methods/:id", removeMethod);

export default router;
