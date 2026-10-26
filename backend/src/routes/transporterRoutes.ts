import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  catalog,
  home,
  earnings,
  ratings,
  profile,
  saveMyProfile,
  availability,
  available,
  mine,
  one,
  accept,
  decline,
  release,
  collect,
  deliver,
  location,
  problem,
} from "../controllers/transporterController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog", catalog);
router.get("/home", home);
router.get("/earnings", earnings);
router.get("/ratings", ratings);

router.get("/profile", profile);
router.put("/profile", saveMyProfile);
router.patch("/availability", availability);

// Rotas fixas primeiro, antes de /:id
router.get("/deliveries/available", available);
router.get("/deliveries/mine", mine);
router.get("/deliveries/:id", one);
router.post("/deliveries/:id/accept", accept);
router.post("/deliveries/:id/decline", decline);
router.post("/deliveries/:id/release", release);
router.post("/deliveries/:id/collect", collect);
router.post("/deliveries/:id/deliver", deliver);
router.post("/deliveries/:id/location", location);
router.post("/deliveries/:id/problem", problem);

export default router;
