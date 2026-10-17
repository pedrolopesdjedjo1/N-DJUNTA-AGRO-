import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  list,
  one,
  mine,
  create,
  update,
  close,
  reopen,
  remove,
  apply,
  unapply,
  applications,
  applicants,
  answer,
} from "../controllers/opportunityController";

const router = Router();

router.use(authMiddleware);

// Rotas fixas primeiro (antes de /:id)
router.get("/mine", mine);
router.get("/applications/mine", applications);

router.get("/", list);
router.post("/", create);

router.get("/:id", one);
router.put("/:id", update);
router.delete("/:id", remove);
router.post("/:id/close", close);
router.post("/:id/reopen", reopen);

router.post("/:id/apply", apply);
router.delete("/:id/apply", unapply);

router.get("/:id/applications", applicants);
router.patch("/:id/applications/:applicationId", answer);

export default router;
