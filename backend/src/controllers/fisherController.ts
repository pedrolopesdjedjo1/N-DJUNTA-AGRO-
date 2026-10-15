import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getDashboard,
  listCatches,
  createCatch,
  updateCatch,
  markCatchSold,
  deleteCatch,
  publishCatch,
  fishPrices,
  getProfile,
  saveProfile,
  getCooperativeHub,
} from "../services/fisherService";

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

export function dashboard(req: AuthRequest, res: Response) {
  return run(res, () => getDashboard(req.userId!));
}

export function catches(req: AuthRequest, res: Response) {
  const days = req.query.days ? Number(req.query.days) : undefined;
  return run(res, () => listCatches(req.userId!, { status: str(req.query.status), q: str(req.query.q), days }));
}

export function newCatch(req: AuthRequest, res: Response) {
  return run(res, () => createCatch(req.userId!, req.body), 201);
}

export function editCatch(req: AuthRequest, res: Response) {
  return run(res, () => updateCatch(req.userId!, req.params.id, req.body));
}

export function soldCatch(req: AuthRequest, res: Response) {
  return run(res, () => markCatchSold(req.userId!, req.params.id));
}

export function removeCatch(req: AuthRequest, res: Response) {
  return run(res, () => deleteCatch(req.userId!, req.params.id));
}

export function publish(req: AuthRequest, res: Response) {
  return run(res, () => publishCatch(req.userId!, req.params.id, req.body), 201);
}

export function prices(req: AuthRequest, res: Response) {
  return run(res, () => fishPrices({ q: str(req.query.q), region: str(req.query.region) }));
}

export function profile(req: AuthRequest, res: Response) {
  return run(res, () => getProfile(req.userId!));
}

export function putProfile(req: AuthRequest, res: Response) {
  return run(res, () => saveProfile(req.userId!, req.body));
}

export function cooperative(req: AuthRequest, res: Response) {
  return run(res, () => getCooperativeHub(req.userId!, req.params.id), 200, 404);
}
