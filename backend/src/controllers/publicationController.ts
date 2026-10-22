import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listPublications,
  getPublication,
  myPublications,
  createPublication,
  updatePublication,
  deletePublication,
} from "../services/publicationService";

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

export function list(req: AuthRequest, res: Response) {
  const page = req.query.page ? Number(req.query.page) : undefined;
  return run(res, () =>
    listPublications(req.userId!, {
      kind: str(req.query.kind),
      region: str(req.query.region),
      ownerId: str(req.query.ownerId),
      projectId: str(req.query.projectId),
      q: str(req.query.q),
      page: page && !isNaN(page) ? page : undefined,
      official: req.query.official === "true",
    })
  );
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getPublication(req.userId!, req.params.id), 200, 404);
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () =>
    myPublications(req.userId!, req.userRole, { kind: str(req.query.kind), draft: req.query.draft === "true" })
  );
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createPublication(req.userId!, req.userRole, req.body), 201);
}

export function update(req: AuthRequest, res: Response) {
  return run(res, () => updatePublication(req.userId!, req.userRole, req.params.id, req.body));
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deletePublication(req.userId!, req.userRole, req.params.id));
}
