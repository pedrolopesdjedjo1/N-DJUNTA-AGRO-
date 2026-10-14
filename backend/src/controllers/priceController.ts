import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listPrices,
  pricesByRegion,
  compareMarket,
  history,
  movers,
  mostWanted,
  materialPrices,
  listAlerts,
  createAlert,
  deleteAlert,
  checkAlerts,
} from "../services/priceService";

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

export function prices(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPrices({ q: str(req.query.q), department: str(req.query.department), region: str(req.query.region) })
  );
}

export function regions(req: AuthRequest, res: Response) {
  return run(res, () => pricesByRegion(str(req.query.q) ?? ""));
}

export function compare(req: AuthRequest, res: Response) {
  return run(res, () => compareMarket(req.userId!, str(req.query.q) ?? "", str(req.query.region)));
}

export function evolution(req: AuthRequest, res: Response) {
  const weeks = req.query.weeks ? Number(req.query.weeks) : undefined;
  return run(res, () => history(str(req.query.q) ?? "", weeks));
}

export function changes(req: AuthRequest, res: Response) {
  return run(res, () => movers(str(req.query.department)));
}

export function wanted(req: AuthRequest, res: Response) {
  return run(res, () => mostWanted(str(req.query.department)));
}

export function materials(req: AuthRequest, res: Response) {
  return run(res, () => materialPrices(str(req.query.department)));
}

export function alerts(req: AuthRequest, res: Response) {
  return run(res, () => listAlerts(req.userId!));
}

export function newAlert(req: AuthRequest, res: Response) {
  return run(res, () => createAlert(req.userId!, req.body), 201);
}

export function removeAlert(req: AuthRequest, res: Response) {
  return run(res, () => deleteAlert(req.userId!, req.params.id));
}

export function check(req: AuthRequest, res: Response) {
  return run(res, () => checkAlerts(req.userId!));
}
