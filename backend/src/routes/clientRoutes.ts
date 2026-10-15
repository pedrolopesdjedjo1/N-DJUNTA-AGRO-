import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  home,
  categories,
  products,
  product,
  seller,
  favorites,
  favoriteProduct,
  favoriteSeller,
  sellerNotify,
  addresses,
  newAddress,
  editAddress,
  makeDefault,
  removeAddress,
} from "../controllers/clientController";

const router = Router();

router.use(authMiddleware);

router.get("/home", home);
router.get("/categories", categories);
router.get("/products", products);
router.get("/products/:id", product);
router.get("/sellers/:id", seller);

router.get("/favorites", favorites);
router.post("/favorites/products/:id", favoriteProduct);
router.post("/favorites/sellers/:id", favoriteSeller);
router.patch("/favorites/sellers/:id", sellerNotify);

router.get("/addresses", addresses);
router.post("/addresses", newAddress);
router.put("/addresses/:id", editAddress);
router.post("/addresses/:id/default", makeDefault);
router.delete("/addresses/:id", removeAddress);

export default router;
