import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  catalog,
  institutions,
  programs,
  program,
  newProgram,
  editProgram,
  removeProgram,
  addProject,
  removeProject,
  publicPrograms,
  publicProgram,
} from "../controllers/govController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog", catalog);
router.get("/institutions", institutions);

router.get("/public-programs", publicPrograms);
router.get("/public-programs/:id", publicProgram);

router.get("/programs", programs);
router.post("/programs", newProgram);
router.get("/programs/:id", program);
router.put("/programs/:id", editProgram);
router.delete("/programs/:id", removeProgram);
router.post("/programs/:id/projects", addProject);
router.delete("/programs/:id/projects/:projectId", removeProject);

export default router;
