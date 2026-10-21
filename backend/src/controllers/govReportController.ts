import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createReport,
  myReports,
  getMyReport,
  addCitizenComment,
  deleteMyReport,
  trackProtocol,
  listReports,
  getReportForInstitution,
  setReportStatus,
  respondToReport,
  addInternalNote,
  setReportPriority,
  forwardReport,
} from "../services/govReportService";

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

// ---------- Cidadãos ----------
export function create(req: AuthRequest, res: Response) {
  return run(res, () => createReport(req.userId!, req.body), 201);
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myReports(req.userId!));
}

export function mineOne(req: AuthRequest, res: Response) {
  return run(res, () => getMyReport(req.userId!, req.params.id), 200, 404);
}

export function comment(req: AuthRequest, res: Response) {
  return run(res, () => addCitizenComment(req.userId!, req.params.id, req.body?.message), 201);
}

export function removeMine(req: AuthRequest, res: Response) {
  return run(res, () => deleteMyReport(req.userId!, req.params.id));
}

export function track(req: AuthRequest, res: Response) {
  return run(res, () => trackProtocol(req.params.protocol), 200, 404);
}

// ---------- Instituições ----------
export function list(req: AuthRequest, res: Response) {
  return run(res, () =>
    listReports(req.userId!, req.userRole, {
      scope: str(req.query.scope),
      status: str(req.query.status),
      category: str(req.query.category),
      region: str(req.query.region),
      priority: str(req.query.priority),
      q: str(req.query.q),
    })
  );
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getReportForInstitution(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function status(req: AuthRequest, res: Response) {
  return run(res, () => setReportStatus(req.userId!, req.userRole, req.params.id, req.body));
}

export function respond(req: AuthRequest, res: Response) {
  return run(res, () => respondToReport(req.userId!, req.userRole, req.params.id, req.body?.message), 201);
}

export function note(req: AuthRequest, res: Response) {
  return run(res, () => addInternalNote(req.userId!, req.userRole, req.params.id, req.body?.message), 201);
}

export function priority(req: AuthRequest, res: Response) {
  return run(res, () => setReportPriority(req.userId!, req.userRole, req.params.id, req.body?.priority));
}

export function forward(req: AuthRequest, res: Response) {
  return run(res, () => forwardReport(req.userId!, req.userRole, req.params.id, req.body));
}
