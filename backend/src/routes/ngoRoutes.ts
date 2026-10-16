import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getCatalog,
  organization,
  putOrganization,
  newDocument,
  removeDocument,
  sendVerification,
  pendingVerifications,
  review,
  publicOrganization,
  projects,
  project,
  newProject,
  editProject,
  removeProject,
  newMedia,
  removeMedia,
  newUpdate,
  removeUpdate,
  newResult,
  removeResult,
  publicProjects,
  publicProject,
} from "../controllers/ngoController";

const router = Router();

router.use(authMiddleware);

router.get("/catalog", getCatalog);

router.get("/organization", organization);
router.put("/organization", putOrganization);
router.post("/organization/documents", newDocument);
router.delete("/organization/documents/:id", removeDocument);
router.post("/organization/verification/submit", sendVerification);
router.get("/public/:id", publicOrganization);

router.get("/verification/pending", pendingVerifications);
router.post("/verification/:ownerId/review", review);

router.get("/public-projects", publicProjects);
router.get("/public-projects/:id", publicProject);

router.get("/projects", projects);
router.post("/projects", newProject);
router.get("/projects/:id", project);
router.put("/projects/:id", editProject);
router.delete("/projects/:id", removeProject);
router.post("/projects/:id/media", newMedia);
router.delete("/projects/:id/media/:mediaId", removeMedia);
router.post("/projects/:id/updates", newUpdate);
router.delete("/projects/:id/updates/:updateId", removeUpdate);
router.post("/projects/:id/results", newResult);
router.delete("/projects/:id/results/:resultId", removeResult);

export default router;
