import { Router } from "express";
import { search } from "../controllers/searchController";

const router = Router();

// Buscar produtos não exige login
router.get("/products", search);

export default router;
