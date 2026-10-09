import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  dashboard,
  myStore,
  putStore,
  publicStore,
  myProducts,
  sales,
  customers,
  customerHistory,
  favoriteCustomer,
  promotions,
  newPromotion,
  deletePromotion,
} from "../controllers/merchantController";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", dashboard);
router.get("/store", myStore);
router.put("/store", putStore);
router.get("/stores/:ownerId", publicStore);
router.get("/products", myProducts);
router.get("/sales", sales);
router.get("/customers", customers);
router.get("/customers/:id/history", customerHistory);
router.post("/customers/:id/favorite", favoriteCustomer);
router.get("/promotions", promotions);
router.post("/promotions", newPromotion);
router.delete("/promotions/:id", deletePromotion);

export default router;
