import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import * as c from "../controllers/transportAdminController";

// Entra na linha de /api/backoffice, depois do authMiddleware e do adminContext
const router = Router();

router.get("/catalog/transport", c.catalog);

// Ver (transport.view) e gerir (transport.manage)
router.get("/transport/v2/overview", requirePermission("transport.view"), c.overview);

router.get("/transport/services", requirePermission("transport.view"), c.pointList);
router.post("/transport/services", requirePermission("transport.manage"), c.pointCreate);
router.put("/transport/services/:id", requirePermission("transport.manage"), c.pointUpdate);
router.post("/transport/services/:id/review", requirePermission("transport.manage"), c.pointReview);
router.delete("/transport/services/:id", requirePermission("transport.manage"), c.pointDelete);

router.get("/transport/incidents", requirePermission("transport.view"), c.incidentList);
router.get("/transport/incidents/:id", requirePermission("transport.view"), c.incidentOne);
router.post("/transport/incidents/:id/handle", requirePermission("transport.manage"), c.incidentHandle);

router.get("/transport/payouts", requirePermission("transport.view"), c.payoutList);
router.post("/transport/payouts/:id/resolve", requirePermission("finance.manage", "transport.manage"), c.payoutResolve);

export default router;
