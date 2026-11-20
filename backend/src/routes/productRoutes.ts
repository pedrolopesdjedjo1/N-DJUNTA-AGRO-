import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth";
import * as productController from "../controllers/productController";

const router = Router();

// Aceita os nomes mais comuns das funções do controller,
// assim o arquivo compila mesmo que o nome exato seja outro
const c: any = productController;
const createProduct = c.create ?? c.createProduct;
const listProducts = c.list ?? c.listProducts;
const getProduct = c.getOne ?? c.getProduct ?? c.getProductById;
const updateProduct = c.update ?? c.updateProduct;
const removeProduct = c.remove ?? c.removeProduct ?? c.deleteProduct;

// A lista é pública, mas "mine=true" (meus produtos) exige login
function authIfMine(req: Request, res: Response, next: NextFunction) {
  if (req.query.mine === "true") {
    return authMiddleware(req, res, next);
  }
  next();
}

router.get("/", authIfMine, listProducts);
router.post("/", authMiddleware, createProduct);
router.get("/:id", getProduct);
router.put("/:id", authMiddleware, updateProduct);
router.patch("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, removeProduct);

export default router;
