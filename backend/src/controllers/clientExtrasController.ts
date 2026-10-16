import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  nearbyOffers,
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getClientProfile,
  updateClientProfile,
  badges,
} from "../services/clientExtrasService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export function offers(req: AuthRequest, res: Response) {
  const region = typeof req.query.region === "string" && req.query.region.trim() ? req.query.region.trim() : undefined;
  return run(res, () => nearbyOffers(req.userId!, region));
}

export function methods(req: AuthRequest, res: Response) {
  return run(res, () => listPaymentMethods(req.userId!));
}

export function newMethod(req: AuthRequest, res: Response) {
  return run(res, () => createPaymentMethod(req.userId!, req.body), 201);
}

export function editMethod(req: AuthRequest, res: Response) {
  return run(res, () => updatePaymentMethod(req.userId!, req.params.id, req.body));
}

export function removeMethod(req: AuthRequest, res: Response) {
  return run(res, () => deletePaymentMethod(req.userId!, req.params.id));
}

export function profile(req: AuthRequest, res: Response) {
  return run(res, () => getClientProfile(req.userId!));
}

export function putProfile(req: AuthRequest, res: Response) {
  return run(res, () => updateClientProfile(req.userId!, req.body));
}

export function summary(req: AuthRequest, res: Response) {
  return run(res, () => badges(req.userId!));
}
