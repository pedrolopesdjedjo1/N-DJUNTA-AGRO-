import { Router } from "express";
import { byCategory, byCategoryAndLocation } from "../controllers/marketPriceController";

const router = Router();

// Consultar preços de mercado não exige login - informação pública e útil
router.get("/", byCategory);
router.get("/:category/by-location", byCategoryAndLocation);

export default router;
