import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { catalog } from "../lib/ngoCatalog";
import {
  getOrganization,
  saveOrganization,
  addDocument,
  deleteDocument,
  submitVerification,
  listPendingVerifications,
  reviewVerification,
  getPublicOrganization,
} from "../services/organizationService";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMedia,
  deleteMedia,
  addUpdate,
  deleteUpdate,
  addResult,
  deleteResult,
  listPublicProjects,
  getPublicProject,
} from "../services/ngoProjectService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getCatalog(req: AuthRequest, res: Response) {
  return res.status(200).json(catalog());
}

// ---------- Organização ----------
export function organization(req: AuthRequest, res: Response) {
  return run(res, () => getOrganization(req.userId!, req.userRole));
}

export function putOrganization(req: AuthRequest, res: Response) {
  return run(res, () => saveOrganization(req.userId!, req.userRole, req.body));
}

export function newDocument(req: AuthRequest, res: Response) {
  return run(res, () => addDocument(req.userId!, req.userRole, req.body), 201);
}

export function removeDocument(req: AuthRequest, res: Response) {
  return run(res, () => deleteDocument(req.userId!, req.userRole, req.params.id));
}

export function sendVerification(req: AuthRequest, res: Response) {
  return run(res, () => submitVerification(req.userId!, req.userRole));
}

export function pendingVerifications(req: AuthRequest, res: Response) {
  return run(res, () => listPendingVerifications(req.userRole));
}

export function review(req: AuthRequest, res: Response) {
  return run(res, () => reviewVerification(req.userRole, req.params.ownerId, req.body.approve === true, req.body.note));
}

export function publicOrganization(req: AuthRequest, res: Response) {
  return run(res, () => getPublicOrganization(req.params.id), 200, 404);
}

// ---------- Projetos ----------
export function projects(req: AuthRequest, res: Response) {
  return run(res, () =>
    listProjects(req.userId!, req.userRole, {
      status: str(req.query.status),
      area: str(req.query.area),
      focus: str(req.query.focus),
      q: str(req.query.q),
    })
  );
}

export function project(req: AuthRequest, res: Response) {
  return run(res, () => getProject(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function newProject(req: AuthRequest, res: Response) {
  return run(res, () => createProject(req.userId!, req.userRole, req.body), 201);
}

export function editProject(req: AuthRequest, res: Response) {
  return run(res, () => updateProject(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeProject(req: AuthRequest, res: Response) {
  return run(res, () => deleteProject(req.userId!, req.userRole, req.params.id));
}

export function newMedia(req: AuthRequest, res: Response) {
  return run(res, () => addMedia(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function removeMedia(req: AuthRequest, res: Response) {
  return run(res, () => deleteMedia(req.userId!, req.userRole, req.params.id, req.params.mediaId));
}

export function newUpdate(req: AuthRequest, res: Response) {
  return run(res, () => addUpdate(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function removeUpdate(req: AuthRequest, res: Response) {
  return run(res, () => deleteUpdate(req.userId!, req.userRole, req.params.id, req.params.updateId));
}

export function newResult(req: AuthRequest, res: Response) {
  return run(res, () => addResult(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function removeResult(req: AuthRequest, res: Response) {
  return run(res, () => deleteResult(req.userId!, req.userRole, req.params.id, req.params.resultId));
}

export function publicProjects(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPublicProjects({
      area: str(req.query.area),
      region: str(req.query.region),
      q: str(req.query.q),
      status: str(req.query.status),
    })
  );
}

export function publicProject(req: AuthRequest, res: Response) {
  return run(res, () => getPublicProject(req.userId!, req.params.id), 200, 404);
}
