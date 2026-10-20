import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { govCatalog } from "../lib/govCatalog";
import { listOrganizations } from "../services/ngoDirectoryService";
import {
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  linkProject,
  unlinkProject,
  listPublicPrograms,
  getPublicProgram,
} from "../services/govProgramService";

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

export function catalog(req: AuthRequest, res: Response) {
  return res.status(200).json(govCatalog());
}

// Instituições públicas registadas no app
export function institutions(req: AuthRequest, res: Response) {
  return run(res, () =>
    listOrganizations({
      kind: "GOVERNO",
      q: str(req.query.q),
      region: str(req.query.region),
      area: str(req.query.area),
      verifiedOnly: req.query.verified === "true",
    })
  );
}

// ---------- Programas ----------
export function programs(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPrograms(req.userId!, req.userRole, {
      status: str(req.query.status),
      area: str(req.query.area),
      q: str(req.query.q),
    })
  );
}

export function program(req: AuthRequest, res: Response) {
  return run(res, () => getProgram(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function newProgram(req: AuthRequest, res: Response) {
  return run(res, () => createProgram(req.userId!, req.userRole, req.body), 201);
}

export function editProgram(req: AuthRequest, res: Response) {
  return run(res, () => updateProgram(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeProgram(req: AuthRequest, res: Response) {
  return run(res, () => deleteProgram(req.userId!, req.userRole, req.params.id));
}

export function addProject(req: AuthRequest, res: Response) {
  return run(res, () => linkProject(req.userId!, req.userRole, req.params.id, req.body?.projectId), 201);
}

export function removeProject(req: AuthRequest, res: Response) {
  return run(res, () => unlinkProject(req.userId!, req.userRole, req.params.id, req.params.projectId));
}

export function publicPrograms(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPublicPrograms({
      area: str(req.query.area),
      region: str(req.query.region),
      q: str(req.query.q),
      status: str(req.query.status),
    })
  );
}

export function publicProgram(req: AuthRequest, res: Response) {
  return run(res, () => getPublicProgram(req.userId!, req.params.id), 200, 404);
}
