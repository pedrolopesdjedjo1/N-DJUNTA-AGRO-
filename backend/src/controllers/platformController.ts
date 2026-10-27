import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { fileReport, myReports } from "../services/adminReportService";
import { submitIdentity, myIdentity } from "../services/adminIdentityService";
import { REPORT_CATEGORIES, REPORT_TARGETS, IDENTITY_DOC_KINDS } from "../lib/adminUserCatalog";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Listas para as telas de denunciar e de pedir a verificação (qualquer pessoa)
export function catalog(req: AuthRequest, res: Response) {
  return res.status(200).json({ reportTargets: REPORT_TARGETS, reportCategories: REPORT_CATEGORIES, identityKinds: IDENTITY_DOC_KINDS });
}

export function reportCreate(req: AuthRequest, res: Response) {
  return run(res, () => fileReport(req.userId!, req.body), 201);
}

export function reportsMine(req: AuthRequest, res: Response) {
  return run(res, () => myReports(req.userId!));
}

export function identityCreate(req: AuthRequest, res: Response) {
  return run(res, () => submitIdentity(req.userId!, req.body), 201);
}

export function identityMine(req: AuthRequest, res: Response) {
  return run(res, () => myIdentity(req.userId!));
}
