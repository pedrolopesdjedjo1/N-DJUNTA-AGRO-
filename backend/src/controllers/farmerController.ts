import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getDashboard,
  getProduction,
  updateQuantity,
  markSold,
  getProfile,
  saveProfile,
  listCooperatives,
  getCooperative,
} from "../services/farmerService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

export function dashboard(req: AuthRequest, res: Response) {
  return run(res, () => getDashboard(req.userId!));
}

export function production(req: AuthRequest, res: Response) {
  return run(res, () => getProduction(req.userId!));
}

export function quantity(req: AuthRequest, res: Response) {
  return run(res, () => updateQuantity(req.userId!, req.params.id, req.body.quantity));
}

export function sold(req: AuthRequest, res: Response) {
  return run(res, () => markSold(req.userId!, req.params.id));
}

export function profile(req: AuthRequest, res: Response) {
  return run(res, () => getProfile(req.userId!));
}

export function putProfile(req: AuthRequest, res: Response) {
  return run(res, () => saveProfile(req.userId!, req.body));
}

export function cooperatives(req: AuthRequest, res: Response) {
  const near = typeof req.query.near === "string" && req.query.near.trim() ? req.query.near.trim() : undefined;
  return run(res, () => listCooperatives(req.userId!, near));
}

export function cooperative(req: AuthRequest, res: Response) {
  return run(res, () => getCooperative(req.userId!, req.params.id), 200, 404);
}
