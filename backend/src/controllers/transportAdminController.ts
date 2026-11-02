import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { transportAdminCatalog } from "../lib/transportAdminCatalog";
import * as admin from "../services/transportAdminService";

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

export const catalog = (req: AuthRequest, res: Response) => res.status(200).json(transportAdminCatalog());
export const overview = (req: AuthRequest, res: Response) => run(res, () => admin.transportExtraOverview());

// ---------- Postos e oficinas ----------
export const pointList = (req: AuthRequest, res: Response) =>
  run(res, () => admin.listPointsAdmin({ status: str(req.query.status), kind: str(req.query.kind), region: str(req.query.region), q: str(req.query.q), page: num(req.query.page) }));
export const pointCreate = (req: AuthRequest, res: Response) => run(res, () => admin.createPointAdmin(req.userId!, req.body), 201);
export const pointUpdate = (req: AuthRequest, res: Response) => run(res, () => admin.updatePointAdmin(req.userId!, req.params.id, req.body));
export const pointReview = (req: AuthRequest, res: Response) => run(res, () => admin.reviewPointAdmin(req.userId!, req.params.id, req.body));
export const pointDelete = (req: AuthRequest, res: Response) => run(res, () => admin.deletePointAdmin(req.userId!, req.params.id));

// ---------- Ocorrências ----------
export const incidentList = (req: AuthRequest, res: Response) =>
  run(res, () => admin.listIncidentsAdmin({ status: str(req.query.status), kind: str(req.query.kind), page: num(req.query.page) }));
export const incidentOne = (req: AuthRequest, res: Response) => run(res, () => admin.getIncidentAdmin(req.params.id), 200, 404);
export const incidentHandle = (req: AuthRequest, res: Response) => run(res, () => admin.handleIncidentAdmin(req.userId!, req.params.id, req.body));

// ---------- Pagamentos ----------
export const payoutList = (req: AuthRequest, res: Response) =>
  run(res, () => admin.listPayoutsAdmin({ status: str(req.query.status), transporterId: str(req.query.transporterId), page: num(req.query.page) }));
export const payoutResolve = (req: AuthRequest, res: Response) => run(res, () => admin.resolvePayoutAdmin(req.userId!, req.params.id, req.body));
