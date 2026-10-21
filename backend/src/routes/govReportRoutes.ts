import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  create,
  mine,
  mineOne,
  comment,
  removeMine,
  track,
  list,
  one,
  status,
  respond,
  note,
  priority,
  forward,
} from "../controllers/govReportController";

const router = Router();

router.use(authMiddleware);

// Cidadãos: enviar, acompanhar e juntar informação
router.post("/reports", create);
router.get("/my-reports", mine);
router.get("/my-reports/:id", mineOne);
router.post("/my-reports/:id/comment", comment);
router.delete("/my-reports/:id", removeMine);
router.get("/track/:protocol", track);

// Instituições públicas: receber e tratar
router.get("/reports", list);
router.get("/reports/:id", one);
router.patch("/reports/:id/status", status);
router.post("/reports/:id/respond", respond);
router.post("/reports/:id/note", note);
router.patch("/reports/:id/priority", priority);
router.post("/reports/:id/forward", forward);

export default router;
