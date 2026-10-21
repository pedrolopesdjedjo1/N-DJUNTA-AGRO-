import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  services,
  service,
  mineServices,
  newService,
  editService,
  serviceStatus,
  removeService,
  places,
  place,
  newPlace,
  editPlace,
  placeStatus,
  removePlace,
} from "../controllers/govPublicController";

const router = Router();

router.use(authMiddleware);

// Serviços públicos (rotas fixas primeiro, antes de /:id)
router.get("/services/mine", mineServices);
router.get("/services", services);
router.post("/services", newService);
router.get("/services/:id", service);
router.put("/services/:id", editService);
router.patch("/services/:id/status", serviceStatus);
router.delete("/services/:id", removeService);

// Infraestruturas, mercados e zonas de produção
router.get("/places", places);
router.post("/places", newPlace);
router.get("/places/:id", place);
router.put("/places/:id", editPlace);
router.patch("/places/:id/status", placeStatus);
router.delete("/places/:id", removePlace);

export default router;
