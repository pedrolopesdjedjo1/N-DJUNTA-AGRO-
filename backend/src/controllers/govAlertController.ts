import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listRegionsInfo,
  createAlert,
  updateAlert,
  endAlert,
  deleteAlert,
  myAlerts,
  listAlerts,
  getAlert,
} from "../services/govAlertService";

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

export function regions(req: AuthRequest, res: Response) {
  return res.status(200).json(listRegionsInfo());
}

export function list(req: AuthRequest, res: Response) {
  return run(res, () =>
    listAlerts(req.userId!, req.userRole, {
      region: str(req.query.region),
      kind: str(req.query.kind),
      severity: str(req.query.severity),
      all: req.query.all === "true",
    })
  );
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myAlerts(req.userId!, req.userRole));
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getAlert(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createAlert(req.userId!, req.userRole, req.body), 201);
}

export function update(req: AuthRequest, res: Response) {
  return run(res, () => updateAlert(req.userId!, req.userRole, req.params.id, req.body));
}

export function end(req: AuthRequest, res: Response) {
  return run(res, () => endAlert(req.userId!, req.userRole, req.params.id, req.body?.notifyEnd === true));
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deleteAlert(req.userId!, req.userRole, req.params.id));
}
