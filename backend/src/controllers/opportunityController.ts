import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listOpportunities,
  getOpportunity,
  myOpportunities,
  createOpportunity,
  updateOpportunity,
  closeOpportunity,
  reopenOpportunity,
  deleteOpportunity,
  applyTo,
  withdraw,
  myApplications,
  listApplications,
  answerApplication,
} from "../services/opportunityService";

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
  return run(res, () =>
    listOpportunities(req.userId!, {
      kind: str(req.query.kind),
      area: str(req.query.area),
      region: str(req.query.region),
      q: str(req.query.q),
      when: str(req.query.when),
    })
  );
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getOpportunity(req.userId!, req.params.id), 200, 404);
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myOpportunities(req.userId!, req.userRole));
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createOpportunity(req.userId!, req.userRole, req.body), 201);
}

export function update(req: AuthRequest, res: Response) {
  return run(res, () => updateOpportunity(req.userId!, req.userRole, req.params.id, req.body));
}

export function close(req: AuthRequest, res: Response) {
  return run(res, () => closeOpportunity(req.userId!, req.userRole, req.params.id));
}

export function reopen(req: AuthRequest, res: Response) {
  return run(res, () => reopenOpportunity(req.userId!, req.userRole, req.params.id));
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deleteOpportunity(req.userId!, req.userRole, req.params.id));
}

export function apply(req: AuthRequest, res: Response) {
  return run(res, () => applyTo(req.userId!, req.params.id, req.body), 201);
}

export function unapply(req: AuthRequest, res: Response) {
  return run(res, () => withdraw(req.userId!, req.params.id));
}

export function applications(req: AuthRequest, res: Response) {
  return run(res, () => myApplications(req.userId!));
}

export function applicants(req: AuthRequest, res: Response) {
  return run(res, () => listApplications(req.userId!, req.userRole, req.params.id, { status: str(req.query.status) }));
}

export function answer(req: AuthRequest, res: Response) {
  return run(res, () => answerApplication(req.userId!, req.userRole, req.params.id, req.params.applicationId, req.body));
}
