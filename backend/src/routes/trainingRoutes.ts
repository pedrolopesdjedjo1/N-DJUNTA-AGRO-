import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  mine,
  managed,
  create,
  update,
  cancel,
  remove,
  newParticipant,
  editParticipant,
  completeAll,
  removeEnrollment,
  newMaterial,
  removeMaterial,
  list,
  detail,
  join,
  leave,
  enrollments,
  certificate,
  verify,
} from "../controllers/trainingController";

const router = Router();

router.use(authMiddleware);

// Rotas fixas primeiro (antes de /:id)
router.get("/mine", mine);
router.get("/manage/:id", managed);
router.get("/enrollments/mine", enrollments);
router.get("/enrollments/:enrollmentId/certificate", certificate);
router.get("/certificates/:code", verify);

router.get("/", list);
router.post("/", create);

router.get("/:id", detail);
router.put("/:id", update);
router.delete("/:id", remove);
router.post("/:id/cancel", cancel);
router.post("/:id/enroll", join);
router.delete("/:id/enroll", leave);

router.post("/:id/participants", newParticipant);
router.patch("/:id/participants/:enrollmentId", editParticipant);
router.delete("/:id/participants/:enrollmentId", removeEnrollment);
router.post("/:id/complete-attendees", completeAll);

router.post("/:id/materials", newMaterial);
router.delete("/:id/materials/:materialId", removeMaterial);

export default router;
