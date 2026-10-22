import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getStats } from "../services/govStatsService";
import { getHome, getGovMap } from "../services/govMonitorService";

async function run(res: Response, work: () => Promise<any>) {
  try {
    return res.status(200).json(await work());
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

export function stats(req: AuthRequest, res: Response) {
  const months = req.query.months ? Number(req.query.months) : undefined;
  return run(res, () => getStats(req.userRole, { region: str(req.query.region), months: months && !isNaN(months) ? months : undefined }));
}

export function map(req: AuthRequest, res: Response) {
  return run(res, () => getGovMap(req.userId!, req.userRole, { layers: str(req.query.layers) }));
}
