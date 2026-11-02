import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as c from "../controllers/transporterToolsController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog/tools", c.toolsCatalog);

// Mapa e rotas
router.get("/map/v2", c.map);
router.get("/route/plan", c.plan);
router.get("/deliveries/:id/route", c.deliveryRoute);

// Postos, oficinas, estacionamentos e manutenção
router.get("/services", c.services);
router.get("/services/mine", c.serviceMine);
router.post("/services/suggest", c.serviceSuggest);

// Segurança, dicas e configurações
router.get("/safety/tips", c.tips);
router.get("/security", c.security);
router.get("/settings", c.settings);

// Emergência
router.get("/emergency/contacts", c.emergencyGet);
router.put("/emergency/contacts", c.emergencySave);
router.get("/incidents", c.incidentList);
router.post("/incidents", c.incidentCreate);
router.get("/incidents/:id", c.incidentOne);
router.post("/incidents/:id/resolve", c.incidentResolve);

export default router;
