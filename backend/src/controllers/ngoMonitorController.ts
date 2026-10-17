import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getHome, getMonitoring, getReport, getMap } from "../services/ngoMonitorService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function home(req: AuthRequest, res: Response) {
  return run(res, () => getHome(req.userId!, req.userRole));
}

export function monitoring(req: AuthRequest, res: Response) {
  return run(res, () =>
    getMonitoring(req.userId!, req.userRole, {
      projectId: str(req.query.projectId),
      from: str(req.query.from),
      to: str(req.query.to),
    })
  );
}

export function report(req: AuthRequest, res: Response) {
  return run(res, () =>
    getReport(req.userId!, req.userRole, {
      projectId: str(req.query.projectId),
      from: str(req.query.from),
      to: str(req.query.to),
      includeFinance: req.query.includeFinance === "true",
    })
  );
}

export function map(req: AuthRequest, res: Response) {
  return run(res, () => getMap(req.userId!, req.userRole, { layers: str(req.query.layers), scope: str(req.query.scope) }));
}
