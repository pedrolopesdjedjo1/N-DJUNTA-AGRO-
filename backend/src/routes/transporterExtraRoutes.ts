import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  publicCard,
  addDoc,
  removeDoc,
  submit,
  map,
  earningsHistory,
  report,
  adminList,
  adminReview,
} from "../controllers/transporterExtraController";

const router = Router();

router.use(authMiddleware);

// Perfil: documentos e verificação
router.post("/profile/documents", addDoc);
router.delete("/profile/documents/:id", removeDoc);
router.post("/profile/submit", submit);
router.get("/public/:id", publicCard);

// Mapa, ganhos e relatório
router.get("/map", map);
router.get("/earnings/history", earningsHistory);
router.get("/report", report);

// Equipa do app
router.get("/admin/transporters", adminList);
router.post("/admin/transporters/:userId/review", adminReview);

export default router;
