import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import * as c from "../controllers/backofficeOpsController";

// A autenticação e o adminContext entram no server.ts, antes destas rotas
const router = Router();

router.get("/catalog/ops", c.opsCatalog);

// Mercado (rotas fixas primeiro, antes de /:id)
router.get("/market/products", requirePermission("market.view"), c.products);
router.get("/market/featured", requirePermission("market.view"), c.featured);
router.get("/market/quality", requirePermission("market.view"), c.quality);
router.get("/market/categories", requirePermission("market.view"), c.categories);
router.put("/market/categories/:department", requirePermission("market.moderate"), c.categorySave);
router.post("/market/products/bulk-approve", requirePermission("market.moderate"), c.productBulkApprove);
router.get("/market/products/:id", requirePermission("market.view"), c.productOne);
router.post("/market/products/:id/approve", requirePermission("market.moderate"), c.productApprove);
router.post("/market/products/:id/reject", requirePermission("market.moderate"), c.productReject);
router.post("/market/products/:id/remove", requirePermission("market.moderate"), c.productRemove);
router.post("/market/products/:id/restore", requirePermission("market.moderate"), c.productRestore);
router.post("/market/products/:id/quality", requirePermission("market.moderate"), c.productQuality);
router.post("/market/products/:id/feature", requirePermission("market.moderate"), c.productFeature);
router.post("/market/products/:id/unfeature", requirePermission("market.moderate"), c.productUnfeature);

// Encomendas
router.get("/orders", requirePermission("orders.view"), c.orderList);
router.get("/orders/:id", requirePermission("orders.view"), c.orderOne);
router.post("/orders/:id/note", requirePermission("orders.manage"), c.orderNote);
router.post("/orders/:id/notify", requirePermission("orders.manage"), c.orderNotify);

// Disputas
router.get("/disputes", requirePermission("orders.view"), c.disputeList);
router.get("/disputes/:id", requirePermission("orders.view"), c.disputeOne);
router.post("/disputes/:id/assign", requirePermission("orders.manage"), c.disputeAssign);
router.post("/disputes/:id/note", requirePermission("orders.manage"), c.disputeNote);
router.post("/disputes/:id/message", requirePermission("orders.manage"), c.disputeMessage);
router.post("/disputes/:id/resolve", requirePermission("orders.manage"), c.disputeResolve);

// Transportes
router.get("/transport/overview", requirePermission("transport.view"), c.transportOverview);
router.get("/transport/transporters", requirePermission("transport.view"), c.transporters);
router.post("/transport/transporters/:userId/warn", requirePermission("transport.manage"), c.transporterWarn);
router.get("/transport/deliveries", requirePermission("transport.view"), c.deliveries);
router.get("/transport/deliveries/:id", requirePermission("transport.view"), c.deliveryOne);
router.post("/transport/deliveries/:id/handle", requirePermission("transport.manage"), c.deliveryHandle);
router.get("/transport/routes", requirePermission("transport.view"), c.routesReport);
router.get("/transport/problems", requirePermission("transport.view"), c.problems);
router.get("/transport/complaints", requirePermission("transport.view"), c.complaints);
router.get("/transport/ratings", requirePermission("transport.view"), c.ratings);
router.get("/transport/verification", requirePermission("transport.manage"), c.verification);
router.post("/transport/verification/:userId/review", requirePermission("transport.manage"), c.verificationReview);

export default router;
