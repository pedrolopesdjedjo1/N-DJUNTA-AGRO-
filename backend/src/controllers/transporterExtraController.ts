import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getPublicTransporter } from "../services/transporterService";
import {
  addDocument,
  deleteDocument,
  submitVerification,
  adminListTransporters,
  adminReviewTransporter,
} from "../services/transporterVerificationService";
import { getTransporterMap } from "../services/transportMapService";
import { listEarnings, getReport } from "../services/transportEarningsService";

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

function num(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

export function publicCard(req: AuthRequest, res: Response) {
  return run(res, () => getPublicTransporter(req.userId!, req.params.id), 200, 404);
}

export function addDoc(req: AuthRequest, res: Response) {
  return run(res, () => addDocument(req.userId!, req.userRole, req.body), 201);
}

export function removeDoc(req: AuthRequest, res: Response) {
  return run(res, () => deleteDocument(req.userId!, req.userRole, req.params.id));
}

export function submit(req: AuthRequest, res: Response) {
  return run(res, () => submitVerification(req.userId!, req.userRole));
}

export function map(req: AuthRequest, res: Response) {
  return run(res, () => getTransporterMap(req.userId!, req.userRole, { layers: str(req.query.layers), scope: str(req.query.scope) }));
}

export function earningsHistory(req: AuthRequest, res: Response) {
  return run(res, () => listEarnings(req.userId!, req.userRole, { from: str(req.query.from), to: str(req.query.to), page: num(req.query.page) }));
}

export function report(req: AuthRequest, res: Response) {
  return run(res, () => getReport(req.userId!, req.userRole, { from: str(req.query.from), to: str(req.query.to) }));
}

// ---------- Equipa do app ----------
export function adminList(req: AuthRequest, res: Response) {
  return run(res, () => adminListTransporters(req.userRole, { status: str(req.query.status), q: str(req.query.q) }));
}

export function adminReview(req: AuthRequest, res: Response) {
  return run(res, () => adminReviewTransporter(req.userRole, req.userId!, req.params.userId, req.body));
}
